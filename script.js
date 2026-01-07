let scene, camera, renderer, world, diceBody, diceMesh;
const canvas = document.getElementById('dice-canvas');

// --- AUDIO CLACK ---
function playClack() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

// --- FISICA 3D ---
function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 10, 0); camera.lookAt(0,0,0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    world = new CANNON.World();
    world.gravity.set(0, -35, 0);

    const wallMat = new CANNON.Material();
    const diceMat = new CANNON.Material();
    world.addContactMaterial(new CANNON.ContactMaterial(diceMat, wallMat, { friction: 0.2, restitution: 0.6 }));

    // Pavimento e Pareti
    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: wallMat });
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
    world.addBody(ground);

    const walls = [
        {p: [0,0,-4], r:[0,0]}, {p: [0,0,4], r:[Math.PI,0]},
        {p: [-5,0,0], r:[0,Math.PI/2]}, {p: [5,0,0], r:[0,-Math.PI/2]}
    ];
    walls.forEach(w => {
        const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: wallMat });
        b.position.set(w.p[0], w.p[1], w.p[2]);
        if(w.r[0]) b.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), w.r[0]);
        if(w.r[1]) b.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), w.r[1]);
        world.addBody(b);
    });

    // Dado
    const geo = new THREE.IcosahedronGeometry(1.2, 0);
    const mat = new THREE.MeshPhongMaterial({ color: 0x000000, emissive: 0xff00ff, emissiveIntensity: 0.6, flatShading: true });
    diceMesh = new THREE.Mesh(geo, mat);
    diceMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color: 0xff00ff})));
    scene.add(diceMesh);

    diceBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(1.2), material: diceMat });
    diceBody.position.set(0, 2, 0);
    diceBody.addEventListener("collide", (e) => { if(Math.abs(e.contact.getImpactVelocityAlongNormal()) > 2) playClack(); });
    world.addBody(diceBody);

    scene.add(new THREE.PointLight(0xff00ff, 2, 50));
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    world.step(1/60);
    diceMesh.position.copy(diceBody.position);
    diceMesh.quaternion.copy(diceBody.quaternion);
    renderer.render(scene, camera);
}

// --- SCHEDA ---
function lanciaDado(nome, statKey) {
    diceBody.position.set(0, 5, 0);
    diceBody.velocity.set((Math.random()-0.5)*30, 15, (Math.random()-0.5)*30);
    diceBody.angularVelocity.set(Math.random()*20, Math.random()*20, Math.random()*20);
    document.getElementById('dice-total').innerText = "...";
    setTimeout(() => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const score = parseInt(document.getElementById(statKey + '-score').value) || 10;
        const mod = Math.floor((score - 10) / 2);
        document.getElementById('dice-total').innerText = d20 + mod;
        document.getElementById('dice-text').innerText = `${nome}: ${d20} + ${mod}`;
    }, 1500);
}

function openTab(evt, name) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).style.display = 'block';
    evt.currentTarget.classList.add('active');
}

function addRow(id, ph, val = "") {
    const div = document.createElement('div');
    div.className = 'list-row';
    div.innerHTML = `<input type="text" placeholder="${ph}" value="${val}" oninput="salvaDati()"><button class="del-btn" onclick="this.parentElement.remove();salvaDati()">×</button>`;
    document.getElementById(id).appendChild(div);
}

function aggiornaTutto() {
    ['str','dex','con','int','wis','cha'].forEach(s => {
        const score = parseInt(document.getElementById(s+'-score').value) || 10;
        const mod = Math.floor((score - 10) / 2);
        document.getElementById(s+'-mod').innerText = (mod >= 0 ? "+" : "") + mod;
    });
    document.getElementById('ca-value').innerText = 10 + Math.floor((parseInt(document.getElementById('dex-score').value)-10)/2);
    const hpC = parseInt(document.getElementById('hp-current').value) || 0;
    const hpM = parseInt(document.getElementById('hp-max').value) || 1;
    document.getElementById('hp-bar-fill').style.width = Math.min((hpC/hpM)*100, 100) + "%";
    
    // Update Skills
    const skillMap = { 'athletics': 'str', 'stealth': 'dex', 'arcana': 'int', 'perception': 'wis' };
    for (let s in skillMap) {
        const m = Math.floor((parseInt(document.getElementById(skillMap[s]+'-score').value)-10)/2);
        document.getElementById('skill-' + s).innerText = (m >= 0 ? "+" : "") + m;
    }
    salvaDati();
}

function salvaDati() {
    const data = {
        n: document.getElementById('char-name').value,
        c: document.getElementById('char-class').value,
        l: document.getElementById('char-level').value,
        hpc: document.getElementById('hp-current').value,
        hpm: document.getElementById('hp-max').value,
        stats: ['str','dex','con','int','wis','cha'].map(s => document.getElementById(s+'-score').value),
        mag: Array.from(document.querySelectorAll('#list-spells input')).map(i => i.value),
        inv: Array.from(document.querySelectorAll('#list-inv input')).map(i => i.value),
        coins: [document.getElementById('coin-pp').value, document.getElementById('coin-gp').value, document.getElementById('coin-sp').value, document.getElementById('coin-cp').value],
        img: document.getElementById('char-img-display').src
    };
    localStorage.setItem('dnd_app_v1', JSON.stringify(data));
}

function caricaDati() {
    const d = JSON.parse(localStorage.getItem('dnd_app_v1'));
    if(!d) return;
    document.getElementById('char-name').value = d.n;
    document.getElementById('char-class').value = d.c;
    document.getElementById('char-level').value = d.l;
    document.getElementById('hp-current').value = d.hpc;
    document.getElementById('hp-max').value = d.hpm;
    ['str','dex','con','int','wis','cha'].forEach((s, i) => document.getElementById(s+'-score').value = d.stats[i]);
    d.mag.forEach(v => addRow('list-spells', 'Magia', v));
    d.inv.forEach(v => addRow('list-inv', 'Oggetto', v));
    ['coin-pp','coin-gp','coin-sp','coin-cp'].forEach((id, i) => document.getElementById(id).value = d.coins[i]);
    document.getElementById('char-img-display').src = d.img;
    aggiornaTutto();
}

function cambiaAvatar(e) {
    const r = new FileReader();
    r.onload = () => { document.getElementById('char-img-display').src = r.result; salvaDati(); };
    r.readAsDataURL(e.target.files[0]);
}

window.onload = () => { init3D(); caricaDati(); };