const originalPoem = [
    'I', 'walk', 'the', 'street', 'with', 'empty', 'hands',
    'and', 'full', 'intentions', '•', 'Each', 'wrapper',
    'crumpled', 'bottle', 'forgotten', 'can', '•', 'speaks',
    'of', 'careless', 'moments', '•', 'But', 'my', 'fingers',
    'close', 'around', 'them', 'gently', '•', 'transforming',
    'waste', 'into', 'care', '•', 'The', 'bag', 'grows',
    'heavy', '•', 'my', 'heart', 'grows', 'light', '•',
    'One', 'piece', 'at', 'a', 'time', '•', 'we', 'heal',
    'the', 'world'
  ];
  
  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
    '#6c5ce7', '#fd79a8', '#fdcb6e', '#00b894',
    '#e17055', '#74b9ff', '#a29bfe', '#55efc4'
  ];
  
  const backendUrl = 'https://frigemagnet.onrender.com';
  
  let positions = {}, dragged = null, offset = {};
  
  // --- POLLING FOR UPDATES ---
  async function pollPositions() {
    try {
      const res = await fetch(`${backendUrl}/load`);
      const newPositions = await res.json();
      
      // Only update if positions changed
      if (JSON.stringify(newPositions) !== JSON.stringify(positions)) {
        positions = newPositions;
        applyPositions();
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }
  
  // Poll every 2 seconds for updates from other users
  setInterval(pollPositions, 2000);
  
  // --- APPLY POSITIONS TO UI ---
  function applyPositions() {
    document.querySelectorAll('.magnet').forEach(m => {
      const i = m.dataset.index;
      if (positions[i] && !m.classList.contains('dragging')) {
        m.style.left = positions[i].x + 'px';
        m.style.top = positions[i].y + 'px';
      }
    });
  }
  
  // --- INITIALIZE ---
  async function initializeFridge() {
    const fridge = document.getElementById('fridge');
    fridge.innerHTML = '';
  
    try {
      const res = await fetch(`${backendUrl}/load`);
      positions = await res.json() || {};
    } catch {
      positions = {};
    }
  
    originalPoem.forEach((word, i) => {
      const magnet = document.createElement('div');
      magnet.className = 'magnet';
      magnet.textContent = word;
      magnet.dataset.index = i;
      magnet.style.backgroundColor = colors[i % colors.length];
      magnet.style.color = word === '•' ? '#333' : '#00ffea';
  
      const row = Math.floor(i / 8), col = i % 8;
      const x = positions[i]?.x ?? 20 + col * 130;
      const y = positions[i]?.y ?? 20 + row * 60;
  
      magnet.style.left = x + 'px';
      magnet.style.top = y + 'px';
      positions[i] = { x, y };
  
      magnet.addEventListener('mousedown', startDrag);
      magnet.addEventListener('touchstart', startDrag);
      fridge.appendChild(magnet);
    });
  
    applyPositions();
  }
  
  // --- DRAGGING ---
  function startDrag(e) {
    e.preventDefault();
    dragged = e.target;
    dragged.classList.add('dragging');
    
    const fridgeRect = document.getElementById('fridge').getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    
    offset.x = point.clientX - fridgeRect.left - parseInt(dragged.style.left);
    offset.y = point.clientY - fridgeRect.top - parseInt(dragged.style.top);
  
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
  }
  
  function drag(e) {
    if (!dragged) return;
    e.preventDefault();
    
    const fridgeRect = document.getElementById('fridge').getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
  
    let x = point.clientX - fridgeRect.left - offset.x;
    let y = point.clientY - fridgeRect.top - offset.y;
  
    x = Math.max(0, Math.min(x, fridgeRect.width - dragged.offsetWidth));
    y = Math.max(0, Math.min(y, fridgeRect.height - dragged.offsetHeight));
  
    dragged.style.left = x + 'px';
    dragged.style.top = y + 'px';
  }
  
  async function stopDrag(e) {
    if (!dragged) return;
    e.preventDefault();
    
    dragged.classList.remove('dragging');
    const i = dragged.dataset.index;
  
    positions[i] = {
      x: parseInt(dragged.style.left),
      y: parseInt(dragged.style.top)
    };
  
    try {
      await fetch(`${backendUrl}/save`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ positions })
      });
    } catch (err) { 
      console.error(err); 
    }
  
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
    
    dragged = null;
  }
  
  // --- RESET ---
  async function resetPoem() {
    if (!confirm('Reset the poem to original layout?')) return;
    positions = {};
    try {
      await fetch(`${backendUrl}/reset`, { method:'POST' });
    } catch(err) { 
      console.error(err); 
    }
    initializeFridge();
  }
  
  initializeFridge();