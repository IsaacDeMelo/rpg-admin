const firebaseConfig = { databaseURL: "https://rpg-roleplay-on-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let DB_CHARS = {}; let DB_ITEMS = {}; let DB_SKILLS = {}; let DB_RECIPES = {};
const attrNames = { for: 'FOR', res: 'RES', vel: 'VEL', agi: 'AGI', per: 'PER', resm: 'RSM', esp: 'ESP', alm: 'ALM' };

// ======================= NAVEGAÇÃO E INICIALIZAÇÃO =======================
function nav(id) { document.querySelectorAll('.section').forEach(s => s.classList.remove('active')); document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active')); document.getElementById(id).classList.add('active'); event.currentTarget.classList.add('active'); }
function sair() { localStorage.removeItem('rpg_session'); window.location.href = 'login.html'; }

db.ref('characters').on('value', snap => { DB_CHARS = snap.val() || {}; renderChars(); renderCombatSetup(); if(document.getElementById('char-modal').classList.contains('active') && activeCharId) abrirPerfilChar(activeCharId); });
db.ref('items').on('value', snap => { DB_ITEMS = snap.val() || {}; renderItems(); renderAdminCraftTable(); });
db.ref('skills').on('value', snap => { DB_SKILLS = snap.val() || {}; renderSkills(); });
db.ref('recipes').on('value', snap => { DB_RECIPES = snap.val() || {}; renderReceitasGrid(); });
db.ref('combat/active_session').on('value', snap => { updateCombatView(snap.val()) });

// ======================= PERSONAGENS (CRIAR E GERENCIAR) =======================
function criarEntidade() {
    const id = document.getElementById('c-user').value; if(!id) return alert("Precisa definir um Login / ID!");
    db.ref('characters/' + id).set({
        tipo: document.getElementById('c-tipo').value, senha: document.getElementById('c-pass').value, nome: document.getElementById('c-nome').value, classe: document.getElementById('c-classe').value, imagem: document.getElementById('c-img').value || 'https://via.placeholder.com/150', pontos: Number(document.getElementById('c-pts').value) || 0,
        hp: Number(document.getElementById('c-hp').value), hp_max: Number(document.getElementById('c-hp_max').value), mp: Number(document.getElementById('c-mp').value), mp_max: Number(document.getElementById('c-mp_max').value), sp: Number(document.getElementById('c-sp').value), sp_max: Number(document.getElementById('c-sp_max').value),
        atributos_base: { for: Number(document.getElementById('c-for').value), res: Number(document.getElementById('c-res').value), vel: Number(document.getElementById('c-vel').value), agi: Number(document.getElementById('c-agi').value), per: Number(document.getElementById('c-per').value), resm: Number(document.getElementById('c-resm').value), esp: Number(document.getElementById('c-esp').value), alm: Number(document.getElementById('c-alm').value) }
    }).then(() => { alert("Criado com sucesso!"); nav('sec-lib-chars'); });
}
function renderChars() {
    const grid = document.getElementById('grid-chars'); grid.innerHTML = '';
    Object.keys(DB_CHARS).forEach(id => { const c = DB_CHARS[id]; let color = '#3b82f6'; if(c.tipo === 'NPC') color = '#ef4444'; if(c.tipo === 'Criatura') color = '#a855f7'; grid.innerHTML += `<div class="card" onclick="abrirPerfilChar('${id}')"><div class="badge" style="background:${color}; color:#fff;">${c.tipo}</div><img src="${c.imagem}"><div class="info"><h4>${c.nome}</h4><p style="font-size:0.8em; color:#94a3b8">${c.classe}</p></div></div>`;});
}
let activeCharId = null;
function abrirPerfilChar(charId) {
    activeCharId = charId; const c = DB_CHARS[charId]; if(!c) return closeModal('char-modal');
    let statsHtml = ''; Object.keys(attrNames).forEach(k => { statsHtml += `<div class="cp-stat">${attrNames[k]}<span>${(c.atributos_base || {})[k] || 0}</span></div>`; });
    let invMap = {}; let equipableInv = {};
    if(c.inventario) Object.entries(c.inventario).forEach(([key,item]) => { 
        const idb = DB_ITEMS[item.item_id];
        if(idb && (idb.categoria === 'Material' || idb.categoria === 'Consumivel')) invMap[item.item_id] = (invMap[item.item_id] || 0) + 1; 
        else equipableInv[key] = item;
    });
    let invHtml = ''; 
    Object.entries(invMap).forEach(([itemId, qtd]) => { const itemDB = DB_ITEMS[itemId]; if(itemDB) invHtml += `<div class="cp-inv-item" onclick="abrirGerenciadorItem('${charId}', '${itemId}', ${qtd})"><img src="${itemDB.imagem}" title="${itemDB.nome}"><div class="item-badge-cp">x${qtd}</div></div>`; });
    Object.entries(equipableInv).forEach(([key, item]) => { const itemDB = DB_ITEMS[item.item_id]; if(itemDB) invHtml += `<div class="cp-inv-item ${item.equipado ? 'equipped' : ''}" onclick="adminEquipItem('${key}')" style="${item.equipado ? 'border-color:var(--green)' : ''}"><img src="${itemDB.imagem}" title="${itemDB.nome}"></div>`; });

    let skillsHtml = ''; if(c.skills) Object.keys(c.skills).forEach(sId => { const skill = DB_SKILLS[sId]; if(skill) skillsHtml += `<div class="cp-skill-item"><img src="${skill.imagem}"><div><strong style="color:var(--gold); font-size:0.8em;">${skill.nome}</strong><br><span style="font-size:0.7em; cursor:pointer; color:var(--red);" onclick="removerSkill('${charId}','${sId}')">Remover</span></div></div>`; });
    const html = `<div class="char-profile-grid"><div class="cp-left"><img class="cp-avatar" src="${c.imagem}"><div class="cp-name">${c.nome}</div><div class="cp-class">${c.classe} | Pontos: ${c.pontos || 0}</div><div class="cp-vitals"><input type="text" value="${c.hp || 0}/${c.hp_max || 0}" onchange="updateVitals('${charId}', 'hp', this.value)"><input type="text" value="${c.mp || 0}/${c.mp_max || 0}" onchange="updateVitals('${charId}', 'mp', this.value)"><input type="text" value="${c.sp || 0}/${c.sp_max || 0}" onchange="updateVitals('${charId}', 'sp', this.value)"></div><div class="cp-stats-grid">${statsHtml}</div><button class="btn btn-red" style="margin-top:20px;" onclick="deletarChar('${charId}')">Excluir</button></div><div class="cp-right"><div style="display:flex; justify-content:space-between; align-items:center;"><h3>Equipamentos</h3></div><div id="cp-equip-grid" class="cp-equip-grid"></div><div style="display:flex; justify-content:space-between; align-items:center;"><h3>Habilidades</h3><button class="btn" style="width:auto; padding:5px 15px;" onclick="abrirPicker('give_skill', '${charId}')">+ Ensinar</button></div><div class="cp-skill-list">${skillsHtml || '<p style="color:#64748b; font-size:0.8em;">Nenhuma.</p>'}</div><div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;"><h3>Bolsa</h3><button class="btn btn-green" style="width:auto; padding:5px 15px;" onclick="abrirPicker('give_item', '${charId}')">+ Dar Item</button></div><div class="cp-inv-grid">${invHtml || '<p style="color:#64748b; font-size:0.8em;">Vazia.</p>'}</div></div></div>`;
    document.getElementById('char-profile-content').innerHTML = html; document.getElementById('char-modal').classList.add('active');
    renderAdminEquipGrid(c);
}
function updateVitals(charId, type, value) { const [current, max] = value.split('/').map(Number); db.ref(`characters/${charId}`).update({ [type]: current, [`${type}_max`]: max }); }
function removerSkill(charId, skillId) { db.ref(`characters/${charId}/skills/${skillId}`).remove(); }
function deletarChar(id) { if(confirm("Apagar permanentemente?")) { db.ref('characters/'+id).remove(); closeModal('char-modal'); activeCharId = null; } }
function abrirGerenciadorItem(charId, itemId, currentQtd) { document.getElementById('mi-title').innerText = `Gerenciar ${DB_ITEMS[itemId].nome}`; document.getElementById('mi-img').src = DB_ITEMS[itemId].imagem; document.getElementById('mi-current-qtd').innerText = currentQtd; document.getElementById('mi-add-btn').onclick = () => gerenciarQtdItem(charId, itemId, 'add'); document.getElementById('mi-remove-btn').onclick = () => gerenciarQtdItem(charId, itemId, 'remove'); document.getElementById('manage-item-modal').classList.add('active'); }
function gerenciarQtdItem(charId, itemId, action) {
    const qtd = Number(document.getElementById('mi-qtd').value);
    if(action === 'add') { for(let i=0; i<qtd; i++) db.ref(`characters/${charId}/inventario`).push({item_id: itemId, equipado: false}); } 
    else { const invRef = db.ref(`characters/${charId}/inventario`); invRef.orderByChild('item_id').equalTo(itemId).limitToFirst(qtd).once('value', snap => { let updates = {}; snap.forEach(child => { updates[child.key] = null; }); invRef.update(updates); }); }
    closeModal('manage-item-modal');
}
function renderAdminEquipGrid(charData) {
    let eqSlots = { arma1: null, arma2: null, cabeca: null, peitoral: null, pernas: null, acessorio: null };
    Object.entries(charData.inventario || {}).forEach(([key, item]) => {
        if(item.equipado) {
            const idb = DB_ITEMS[item.item_id]; if(!idb) return; let placed = false;
            if(idb.categoria === 'Arma') { if(!eqSlots.arma1) eqSlots.arma1 = {key, idb}; else if(!eqSlots.arma2) eqSlots.arma2 = {key, idb}; }
            else if(idb.categoria === 'Armadura') { if(idb.slot_type === 'Cabeça' && !eqSlots.cabeca) eqSlots.cabeca = {key, idb}; else if(idb.slot_type === 'Peitoral' && !eqSlots.peitoral) eqSlots.peitoral = {key, idb}; else if(idb.slot_type === 'Pernas' && !eqSlots.pernas) eqSlots.pernas = {key, idb}; }
            else if(idb.categoria === 'Acessorio' && !eqSlots.acessorio) eqSlots.acessorio = {key, idb};
        }
    });
    const renderSlot = (data, icon, type) => data ? `<div class="cp-equip-slot filled" onclick="adminUnequipItem('${data.key}')"><img src="${data.idb.imagem}"></div>` : `<div class="cp-equip-slot" onclick="adminEquipFromSlot('${type}')"><i class="fas ${icon}"></i></div>`;
    const grid = document.getElementById('cp-equip-grid');
    grid.innerHTML = `${renderSlot(eqSlots.cabeca, 'fa-helmet-battle', 'cabeca')} ${renderSlot(eqSlots.peitoral, 'fa-tshirt', 'peitoral')} ${renderSlot(eqSlots.pernas, 'fa-shoe-prints', 'pernas')} ${renderSlot(eqSlots.arma1, 'fa-hand-rock', 'arma1')} ${renderSlot(eqSlots.arma2, 'fa-hand-rock', 'arma2')} ${renderSlot(eqSlots.acessorio, 'fa-ring', 'acessorio')}`;
}
function adminEquipFromSlot(slotType) {
    const pickerGrid = document.getElementById('picker-grid'); pickerGrid.innerHTML = ''; let found = false;
    Object.entries(DB_CHARS[activeCharId].inventario || {}).forEach(([key, invItem]) => {
        const idb = DB_ITEMS[invItem.item_id];
        if (idb && !invItem.equipado) {
            let match = false;
            if ((slotType === 'arma1' || slotType === 'arma2') && idb.categoria === 'Arma') match = true;
            if (slotType === 'acessorio' && idb.categoria === 'Acessorio') match = true;
            if (idb.categoria === 'Armadura') { if (slotType === 'cabeca' && idb.slot_type === 'Cabeça') match = true; if (slotType === 'peitoral' && idb.slot_type === 'Peitoral') match = true; if (slotType === 'pernas' && idb.slot_type === 'Pernas') match = true; }
            if (match) { found = true; pickerGrid.innerHTML += `<div class="picker-item" onclick="adminFinalizeEquip('${key}')"><img src="${idb.imagem}"><span style="font-size:0.7em">${idb.nome}</span></div>`; }
        }
    });
    if(!found) pickerGrid.innerHTML = `<p style="color:#64748b; font-size:0.8em;">Nenhum item compatível na bolsa deste personagem.</p>`;
    document.getElementById('picker-title').innerText = `Equipar ${slotType.replace('a1', 'a 1').replace('a2', 'a 2')}`;
    document.getElementById('picker-qtd-box').style.display = 'none';
    document.getElementById('picker-modal').classList.add('active');
}
function adminFinalizeEquip(itemKey) { db.ref(`characters/${activeCharId}/inventario/${itemKey}/equipado`).set(true); closeModal('picker-modal'); }
function adminUnequipItem(itemKey) { if(confirm("Desequipar este item?")) db.ref(`characters/${activeCharId}/inventario/${itemKey}/equipado`).set(false); }

// ======================= ITENS, SKILLS, RECEITAS =======================
function toggleSubcat(catId, wrapperId, consumableId) { const cat = document.getElementById(catId).value; document.getElementById(wrapperId).style.display = (cat === 'Armadura') ? 'block' : 'none'; document.getElementById(consumableId).style.display = (cat === 'Consumivel') ? 'block' : 'none'; }
function criarItem() {
    const id = document.getElementById('i-id').value; if(!id) return alert("Defina o ID do Item!");
    let itemData = { nome: document.getElementById('i-nome').value, imagem: document.getElementById('i-img').value, categoria: document.getElementById('i-cat').value, descricao: document.getElementById('i-desc').value, mods: { for: Number(document.getElementById('m-for').value), res: Number(document.getElementById('m-res').value), vel: Number(document.getElementById('m-vel').value), agi: Number(document.getElementById('m-agi').value), per: Number(document.getElementById('m-per').value), resm: Number(document.getElementById('m-resm').value), esp: Number(document.getElementById('m-esp').value), alm: Number(document.getElementById('m-alm').value) }};
    if(itemData.categoria === 'Armadura') itemData.slot_type = document.getElementById('i-subcat').value;
    if(itemData.categoria === 'Consumivel') itemData.effects = { hp: Number(document.getElementById('i-eff-hp').value), mp: Number(document.getElementById('i-eff-mp').value), sp: Number(document.getElementById('i-eff-sp').value) };
    db.ref('items/' + id).set(itemData).then(() => { alert("Item criado!"); nav('sec-lib-items'); });
}
function renderItems() { const grid = document.getElementById('grid-items'); grid.innerHTML = ''; Object.keys(DB_ITEMS).forEach(id => { const i = DB_ITEMS[id]; grid.innerHTML += `<div class="card" onclick="abrirPerfilItem('${id}')"><div class="badge">${i.categoria}</div><img src="${i.imagem}"><div class="info"><h4>${i.nome}</h4></div></div>`; });}
function abrirPerfilItem(itemId) {
    const item = DB_ITEMS[itemId]; if(!item) return; document.getElementById('e-i-id').value = itemId; document.getElementById('e-i-nome').value = item.nome; document.getElementById('e-i-img').value = item.imagem; document.getElementById('e-i-cat').value = item.categoria; document.getElementById('e-i-desc').value = item.descricao || "";
    toggleSubcat('e-i-cat', 'e-i-subcat-wrapper', 'e-i-consumable-wrapper');
    if(item.categoria === 'Armadura') document.getElementById('e-i-subcat').value = item.slot_type;
    if(item.categoria === 'Consumivel') { const eff = item.effects || {}; document.getElementById('e-i-eff-hp').value = eff.hp || 0; document.getElementById('e-i-eff-mp').value = eff.mp || 0; document.getElementById('e-i-eff-sp').value = eff.sp || 0; }
    const m = item.mods || {}; document.getElementById('e-m-for').value = m.for || 0; document.getElementById('e-m-res').value = m.res || 0; document.getElementById('e-m-vel').value = m.vel || 0; document.getElementById('e-m-agi').value = m.agi || 0; document.getElementById('e-m-per').value = m.per || 0; document.getElementById('e-m-resm').value = m.resm || 0; document.getElementById('e-m-esp').value = m.esp || 0; document.getElementById('e-m-alm').value = m.alm || 0;
    document.getElementById('edit-item-modal').classList.add('active');
}
function salvarEdicaoItem() {
    const id = document.getElementById('e-i-id').value;
    let itemData = { nome: document.getElementById('e-i-nome').value, imagem: document.getElementById('e-i-img').value, categoria: document.getElementById('e-i-cat').value, descricao: document.getElementById('e-i-desc').value, mods: { for: Number(document.getElementById('e-m-for').value), res: Number(document.getElementById('e-m-res').value), vel: Number(document.getElementById('e-m-vel').value), agi: Number(document.getElementById('e-m-agi').value), per: Number(document.getElementById('e-m-per').value), resm: Number(document.getElementById('e-m-resm').value), esp: Number(document.getElementById('e-m-esp').value), alm: Number(document.getElementById('e-m-alm').value) }};
    if(itemData.categoria === 'Armadura') itemData.slot_type = document.getElementById('e-i-subcat').value;
    if(itemData.categoria === 'Consumivel') itemData.effects = { hp: Number(document.getElementById('e-i-eff-hp').value), mp: Number(document.getElementById('e-i-eff-mp').value), sp: Number(document.getElementById('e-i-eff-sp').value) }; else itemData.effects = null; 
    db.ref('items/' + id).set(itemData).then(() => { alert("Relíquia atualizada!"); closeModal('edit-item-modal'); });
}
function excluirItemMundo() { const id = document.getElementById('e-i-id').value; if(confirm("Excluir item da biblioteca?")) { db.ref('items/' + id).remove().then(() => closeModal('edit-item-modal')); }}
function criarSkill() { const id = document.getElementById('s-id').value; if(!id) return alert("Defina o ID da habilidade!"); db.ref('skills/' + id).set({ nome: document.getElementById('s-nome').value, imagem: document.getElementById('s-img').value, descricao: document.getElementById('s-desc').value, buffs: { for: Number(document.getElementById('sb-for').value), res: Number(document.getElementById('sb-res').value), vel: Number(document.getElementById('sb-vel').value), agi: Number(document.getElementById('sb-agi').value), per: Number(document.getElementById('sb-per').value), resm: Number(document.getElementById('sb-resm').value), esp: Number(document.getElementById('sb-esp').value), alm: Number(document.getElementById('sb-alm').value) }}).then(() => alert("Habilidade registrada!"));}
function renderSkills() { const grid = document.getElementById('grid-skills'); grid.innerHTML = ''; Object.keys(DB_SKILLS).forEach(id => { const s = DB_SKILLS[id]; grid.innerHTML += `<div class="card" onclick="abrirPerfilSkill('${id}')" style="display:flex; align-items:center; padding:10px;"><img src="${s.imagem}" style="width:50px; height:50px; border-radius:8px; border:none; margin-right:15px; background:#000;"><h4 style="margin:0; font-size:1em;">${s.nome}</h4></div>`; });}
function abrirPerfilSkill(skillId) {
    const skill = DB_SKILLS[skillId]; if(!skill) return; document.getElementById('e-s-id').value = skillId; document.getElementById('e-s-nome').value = skill.nome; document.getElementById('e-s-img').value = skill.imagem; document.getElementById('e-s-desc').value = skill.descricao || "";
    const b = skill.buffs || {}; document.getElementById('e-sb-for').value = b.for || 0; document.getElementById('e-sb-res').value = b.res || 0; document.getElementById('e-sb-vel').value = b.vel || 0; document.getElementById('e-sb-agi').value = b.agi || 0; document.getElementById('e-sb-per').value = b.per || 0; document.getElementById('e-sb-resm').value = b.resm || 0; document.getElementById('e-sb-esp').value = b.esp || 0; document.getElementById('e-sb-alm').value = b.alm || 0;
    document.getElementById('edit-skill-modal').classList.add('active');
}
function salvarEdicaoSkill() {
    const id = document.getElementById('e-s-id').value;
    db.ref('skills/' + id).update({
        nome: document.getElementById('e-s-nome').value, imagem: document.getElementById('e-s-img').value, descricao: document.getElementById('e-s-desc').value,
        buffs: { for: Number(document.getElementById('e-sb-for').value), res: Number(document.getElementById('e-sb-res').value), vel: Number(document.getElementById('e-sb-vel').value), agi: Number(document.getElementById('e-sb-agi').value), per: Number(document.getElementById('e-sb-per').value), resm: Number(document.getElementById('e-sb-resm').value), esp: Number(document.getElementById('e-sb-esp').value), alm: Number(document.getElementById('e-sb-alm').value) }
    }).then(() => { alert("Habilidade atualizada!"); closeModal('edit-skill-modal'); });
}
function excluirSkillMundo() { const id = document.getElementById('e-s-id').value; if(confirm("Excluir habilidade da biblioteca?")) { db.ref('skills/' + id).remove().then(() => closeModal('edit-skill-modal')); }}
let pickerContext = { type: null, targetId: null, slotIndex: null };
function abrirPicker(type, targetId = null, slotIndex = null) {
    pickerContext = { type, targetId, slotIndex }; const grid = document.getElementById('picker-grid'); grid.innerHTML = ''; const qtdBox = document.getElementById('picker-qtd-box'); document.getElementById('picker-qtd').value = 1; 
    if(type === 'give_item' || type === 'craft_ing' || type === 'resultado_craft') {
        document.getElementById('picker-title').innerText = "Selecione o Item"; qtdBox.style.display = 'flex'; 
        if(type === 'craft_ing') grid.innerHTML += `<div class="picker-item" onclick="selecionarPicker(null)"><div style="height:100%; min-height:80px; border:2px dashed var(--red); display:flex; align-items:center; justify-content:center; border-radius:8px; color:var(--red); font-weight:bold;">VAZIO</div></div>`;
        Object.keys(DB_ITEMS).forEach(id => { grid.innerHTML += `<div class="picker-item" onclick="selecionarPicker('${id}')"><img src="${DB_ITEMS[id].imagem}"><br><span style="font-size:0.6em; color:#94a3b8;">${DB_ITEMS[id].nome}</span></div>`; });
    } else if (type === 'give_skill') {
        document.getElementById('picker-title').innerText = "Selecione a Habilidade"; qtdBox.style.display = 'none'; 
        Object.keys(DB_SKILLS).forEach(id => { grid.innerHTML += `<div class="picker-item" onclick="selecionarPicker('${id}')"><img src="${DB_SKILLS[id].imagem}"><br><span style="font-size:0.6em; color:#94a3b8;">${DB_SKILLS[id].nome}</span></div>`; });
    }
    document.getElementById('picker-modal').classList.add('active');
}
function selecionarPicker(id_selecionado) {
    const qtd = parseInt(document.getElementById('picker-qtd').value) || 1;
    if(pickerContext.type === 'give_item') { for(let i=0; i<qtd; i++) { db.ref(`characters/${pickerContext.targetId}/inventario`).push({ item_id: id_selecionado, equipado: false }); } }
    else if(pickerContext.type === 'give_skill') { db.ref(`characters/${pickerContext.targetId}/skills/${id_selecionado}`).set(true); } 
    else if(pickerContext.type === 'craft_ing') { adminCraftGrid[pickerContext.slotIndex] = id_selecionado ? { id: id_selecionado, qtd: qtd } : null; renderAdminCraftTable(); } 
    else if(pickerContext.type === 'resultado_craft') { adminCraftResult = id_selecionado ? { id: id_selecionado, qtd: qtd } : null; renderAdminCraftTable(); }
    closeModal('picker-modal');
}
let adminCraftGrid =[null, null, null, null, null, null, null, null, null];
let adminCraftResult = null; 
function renderAdminCraftTable() {
    const table = document.getElementById('admin-craft-table'); table.innerHTML = '';
    for(let i=0; i<9; i++) { const slot = adminCraftGrid[i]; let html = slot && DB_ITEMS[slot.id] ? `<div class="item-badge-admin">x${slot.qtd}</div><img src="${DB_ITEMS[slot.id].imagem}">` : ''; table.innerHTML += `<div class="admin-craft-slot" onclick="abrirPicker('craft_ing', null, ${i})">${html}</div>`; }
    const resBox = document.getElementById('admin-craft-res'); resBox.innerHTML = adminCraftResult && DB_ITEMS[adminCraftResult.id] ? `<div class="item-badge-admin">x${adminCraftResult.qtd}</div><img src="${DB_ITEMS[adminCraftResult.id].imagem}">` : '<span style="color:#64748b; font-size:0.8em; text-align:center;">Resultado<br>(Clique)</span>';
}
function salvarReceitaGrid() {
    if(!adminCraftResult) return alert("Defina o item resultante!");
    const gridSeguro = adminCraftGrid.map(item => item || ""); 
    const receitaId = 'rec_' + Date.now();
    db.ref('recipes/' + receitaId).set({ grid: gridSeguro, resultado: adminCraftResult }).then(() => { alert("Receita gravada!"); adminCraftGrid =[null,null,null,null,null,null,null,null,null]; adminCraftResult = null; renderAdminCraftTable(); });
}
function renderReceitasGrid() {
    const list = document.getElementById('list-recipes'); list.innerHTML = '';
    Object.keys(DB_RECIPES).forEach(rId => {
        const r = DB_RECIPES[rId]; if(!r.grid || !r.resultado) return;
        let resId = typeof r.resultado === 'string' ? r.resultado : r.resultado.id; let resQtd = typeof r.resultado === 'string' ? 1 : (r.resultado.qtd || 1); if(!DB_ITEMS[resId]) return;
        let miniGrid = '<div style="display:grid; grid-template-columns:repeat(3, 20px); gap:2px; margin-right:15px;">';
        for(let i=0; i<9; i++) {
            let slot = r.grid[i]; if (typeof slot === 'string' && slot !== "") slot = {id: slot, qtd: 1};
            let bg = slot && slot.id && DB_ITEMS[slot.id] ? `url(${DB_ITEMS[slot.id].imagem})` : 'rgba(0,0,0,0.5)';
            let badge = slot && slot.qtd > 1 ? `<span style="position:absolute; bottom:0; right:0; background:var(--red); font-size:7px; font-weight:bold; color:white; padding:0 2px;">${slot.qtd}</span>` : '';
            miniGrid += `<div style="width:20px; height:20px; background:${bg} center/cover; border:1px solid var(--border); position:relative;">${badge}</div>`;
        }
        miniGrid += '</div>';
        const resImg = DB_ITEMS[resId].imagem; const resQtdBadge = resQtd > 1 ? `<span style="position:absolute; top:-5px; right:-5px; background:var(--gold); color:black; font-size:10px; font-weight:bold; padding:2px 5px; border-radius:10px;">x${resQtd}</span>` : '';
        list.innerHTML += `<div class="glass-panel" style="padding:15px; margin-bottom:0; display:flex; justify-content:space-between; align-items:center;"><div style="display:flex; align-items:center;">${miniGrid} <i class="fas fa-arrow-right" style="margin-right:15px; color:var(--border);"></i><div style="position:relative;"><img src="${resImg}" style="width:45px; height:45px; border-radius:5px; border:2px solid var(--gold);">${resQtdBadge}</div></div><button class="btn btn-red" style="width:auto; padding:8px 15px;" onclick="db.ref('recipes/${rId}').remove()"><i class="fas fa-trash"></i></button></div>`;
    });
}
        
// ======================= CENA DE COMBATE (DRAG & DROP) =======================
let combatTeamA = {}; let combatTeamB = {};
function renderCombatSetup() {
    const tray = document.getElementById('combat-char-tray'); tray.innerHTML = '';
    const teamA_box = document.getElementById('combat-team-a'); teamA_box.innerHTML = '';
    const teamB_box = document.getElementById('combat-team-b'); teamB_box.innerHTML = '';
    
    Object.entries(DB_CHARS).forEach(([id, char]) => {
        const cardHtml = `<div class="char-tray-card" draggable="true" ondragstart="drag(event, '${id}')"><img src="${char.imagem}"><p>${char.nome}</p></div>`;
        if (combatTeamA[id]) teamA_box.innerHTML += cardHtml;
        else if (combatTeamB[id]) teamB_box.innerHTML += cardHtml;
        else tray.innerHTML += cardHtml;
    });
}
function allowDrop(ev) { ev.preventDefault(); }
function drag(ev, charId) { ev.dataTransfer.setData("charId", charId); }
function drop(ev, team) {
    ev.preventDefault(); const charId = ev.dataTransfer.getData("charId");
    delete combatTeamA[charId]; delete combatTeamB[charId]; 
    if(team === 'A') combatTeamA[charId] = true;
    else if(team === 'B') combatTeamB[charId] = true;
    renderCombatSetup();
}
function iniciarCombate() {
    if(Object.keys(combatTeamA).length === 0 || Object.keys(combatTeamB).length === 0) return alert("Ambos os times precisam de pelo menos um participante.");
    db.ref('combat/active_session').set({ status: 'active', team_a: combatTeamA, team_b: combatTeamB });
}
function encerrarCombate() { db.ref('combat/active_session').remove(); combatTeamA = {}; combatTeamB = {}; renderCombatSetup(); }
function updateCombatView(combatData) {
    if(combatData && combatData.status === 'active') { combatTeamA = combatData.team_a; combatTeamB = combatData.team_b; } 
    else { combatTeamA = {}; combatTeamB = {}; }
    renderCombatSetup();
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); if(id === 'char-modal') activeCharId = null; }
