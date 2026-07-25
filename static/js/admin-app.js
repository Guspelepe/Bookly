// ============================================================
// admin-app.js – Painel do bibliotecário (login obrigatório)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('👤 Admin app iniciado.');

    const MULTA_POR_DIA = 1.00;

    // Credenciais dos bibliotecários
    const BIBLIOTECARIOS = [
        { usuario: "ana", senha: "ana123" },
        { usuario: "carlos", senha: "carlos456" }
    ];

    // DOM elements
    const contentArea = document.getElementById('content-area');
    const sectionTitle = document.getElementById('section-title');
    const adminNomeSpan = document.getElementById('admin-nome');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    // ===== FUNÇÃO PARA REGISTRAR LOG =====
    async function registrarLog(tipo, clienteId, clienteNome, livro, bibliotecario) {
        try {
            await aguardarBanco();
            await db.logs.add({
                tipo: tipo,
                cliente_id: clienteId,
                cliente_nome: clienteNome,
                livro: livro,
                data: new Date().toISOString(),
                bibliotecario: bibliotecario || sessionStorage.getItem('usuario') || 'Bibliotecário'
            });
        } catch (err) {
            console.error('Erro ao registrar log:', err);
        }
    }

    // ===== FUNÇÃO PARA CRIAR NOTIFICAÇÃO PARA USUÁRIO =====
    async function criarNotificacao(usuarioId, mensagem, tipo = 'sistema') {
        try {
            await aguardarBanco();
            await db.notificacoes.add({
                usuario_id: usuarioId,
                mensagem: mensagem,
                lida: false,
                data_criacao: new Date().toISOString(),
                tipo: tipo
            });
        } catch (err) {
            console.error('Erro ao criar notificação:', err);
        }
    }

    // ================================================================
    // RENDERIZAÇÕES
    // ================================================================

    // 1. USUÁRIOS
    async function renderUsuarios() {
        await aguardarBanco();
        const clientes = await db.clientes.toArray();
        const alugueisAtivos = await db.alugueis.where('status').equals('ativo').toArray();
        const mapaAluguel = {};
        alugueisAtivos.forEach(a => { mapaAluguel[a.cliente_id] = a.livro; });

        let html = `<div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; border-bottom:none; padding-bottom:0;">👥 Usuários Cadastrados</h3>
                <button id="btn-novo-usuario" class="tema-botao-sidebar" style="width:auto; padding:8px 16px; background:var(--btn-primary); color:#fff; border:none; border-radius:4px; cursor:pointer;">➕ Novo Usuário</button>
            </div>`;

        if (clientes.length === 0) {
            html += `<p>Nenhum usuário cadastrado.</p>`;
        } else {
            html += `<table class="tabela-usuarios">
                <thead>
                    <tr>
                        <th style="width:60px; text-align:center;">Foto</th>
                        <th style="text-align:left;">Nome</th>
                        <th style="text-align:left;">Apelido</th>
                        <th style="text-align:center;">CPF</th>
                        <th style="text-align:center;">Livro Alugado</th>
                        <th style="text-align:center; min-width:120px;">Ações</th>
                    </tr>
                </thead>
                <tbody>`;
            clientes.forEach(c => {
                const livro = mapaAluguel[c.id] || '—';
                const fotoHtml = c.foto 
                    ? `<img src="${c.foto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; display:block; margin:0 auto;">` 
                    : `<div style="width:36px; height:36px; border-radius:50%; background:var(--bg-sidebar); margin:0 auto; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">📷</div>`;
                html += `<tr>
                    <td style="text-align:center; padding:4px;">${fotoHtml}</td>
                    <td style="text-align:left; font-weight:500;">${c.nome}</td>
                    <td style="text-align:left; color:var(--text-secondary);">${c.apelido || '—'}</td>
                    <td style="text-align:center; font-family:monospace;">${c.cpf}</td>
                    <td style="text-align:center;">${livro !== '—' ? `<span class="status-ativo">${livro}</span>` : '—'}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button onclick="resetarSenha(${c.id}, '${c.nome.replace(/'/g, "\\'")}')" style="background:#f39c12; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem;">🔑 Senha</button>
                        <button onclick="excluirUsuario(${c.id}, '${c.nome.replace(/'/g, "\\'")}')" style="background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem; margin-left:4px;">🗑️ Excluir</button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `</div>`;
        contentArea.innerHTML = html;

        document.getElementById('btn-novo-usuario').addEventListener('click', renderCadastroUsuario);
    }

    window.resetarSenha = async function(id, nome) {
        if (!confirm(`Resetar senha de "${nome}" para "123456"?`)) return;
        await db.clientes.update(id, { senha: '123456' });
        notificar(`Senha de "${nome}" resetada para 123456.`);
    };

    window.excluirUsuario = async function(id, nome) {
        if (!confirm(`Tem certeza que deseja excluir "${nome}"? Esta ação é irreversível.`)) return;
        const aluguelAtivo = await db.alugueis.where({ cliente_id: id, status: 'ativo' }).first();
        if (aluguelAtivo) {
            notificar('Este usuário possui um livro alugado. Devolva o livro antes de excluir.', 'erro');
            return;
        }
        await db.clientes.delete(id);
        await db.avaliacoes.where('usuario_id').equals(id).delete();

        await registrarLog(
            'exclusao_usuario',
            id,
            nome,
            null,
            sessionStorage.getItem('usuario') || 'Bibliotecário'
        );

        notificar(`Usuário "${nome}" excluído com sucesso.`);
        renderUsuarios();
    };

    async function renderCadastroUsuario() {
        await aguardarBanco();
        let html = `<div class="card"><h3>Cadastrar Novo Usuário</h3>
            <form id="form-cadastro-usuario">
                <div>
                    <label for="nome">Nome Completo</label>
                    <input type="text" id="nome" required>
                </div>
                <div>
                    <label for="apelido">Apelido (nick)</label>
                    <input type="text" id="apelido" placeholder="Como será chamado" required>
                    <span id="msg-apelido-admin" class="msg-validacao"></span>
                </div>
                <div>
                    <label for="cpf">CPF</label>
                    <input type="text" id="cpf" placeholder="000.000.000-00" required maxlength="14">
                    <span id="msg-cpf-admin" class="msg-validacao"></span>
                </div>
                <div>
                    <label for="nascimento">Data de Nascimento</label>
                    <input type="date" id="nascimento" required>
                </div>
                <div>
                    <label for="senha-cliente">Senha</label>
                    <input type="password" id="senha-cliente" placeholder="Mínimo 4 caracteres" required>
                </div>
                <div class="full-width">
                    <button type="submit">Cadastrar</button>
                    <button type="button" id="btn-voltar-usuarios" class="secundario" style="margin-left:8px;">Voltar</button>
                </div>
            </form>
        </div>`;
        contentArea.innerHTML = html;

        document.getElementById('cpf').addEventListener('input', function() {
            mascararCPF(this);
        });

        document.getElementById('cpf').addEventListener('blur', async function() {
            const cpfBruto = this.value.replace(/\D/g, '');
            const span = document.getElementById('msg-cpf-admin');
            if (!span) return;
            if (cpfBruto.length === 11 && validarCPF(cpfBruto)) {
                await aguardarBanco();
                const cpfFormatado = cpfBruto.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                const existente = await db.clientes.where('cpf').equals(cpfFormatado).first();
                span.textContent = existente ? '❌ CPF já cadastrado.' : '✅ CPF disponível.';
                span.style.color = existente ? '#e74c3c' : '#27ae60';
            } else {
                span.textContent = cpfBruto.length > 0 ? '❌ CPF inválido.' : '';
                span.style.color = '#e74c3c';
            }
        });

        document.getElementById('apelido').addEventListener('blur', async function() {
            const apelido = this.value.trim();
            const span = document.getElementById('msg-apelido-admin');
            if (!span || !apelido) { if (span) span.textContent = ''; return; }
            await aguardarBanco();
            const existente = await db.clientes.where('apelido').equalsIgnoreCase(apelido).first();
            span.textContent = existente ? '❌ Apelido já está em uso.' : '✅ Apelido disponível.';
            span.style.color = existente ? '#e74c3c' : '#27ae60';
        });

        document.getElementById('form-cadastro-usuario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('nome').value.trim();
            const apelido = document.getElementById('apelido').value.trim();
            const cpfBruto = document.getElementById('cpf').value.replace(/\D/g, '');
            const nascimento = document.getElementById('nascimento').value;
            const senha = document.getElementById('senha-cliente').value;

            if (!validarCPF(cpfBruto)) {
                notificar('CPF inválido.', 'erro');
                return;
            }
            if (!nome || !apelido || cpfBruto.length !== 11 || !nascimento || !senha) {
                notificar('Preencha todos os campos.', 'erro');
                return;
            }

            const cpfFormatado = cpfBruto.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            const cpfExistente = await db.clientes.where('cpf').equals(cpfFormatado).first();
            if (cpfExistente) { notificar('CPF já cadastrado.', 'erro'); return; }
            const apelidoExistente = await db.clientes.where('apelido').equalsIgnoreCase(apelido).first();
            if (apelidoExistente) { notificar('Apelido já em uso.', 'erro'); return; }

            await db.clientes.add({
                nome, apelido, cpf: cpfFormatado, nascimento, senha,
                livros_lidos: 0, media_estrelas: 0, lendo_agora: '', bio: '', foto: ''
            });

            await registrarLog(
                'criacao_usuario',
                null,
                nome,
                null,
                sessionStorage.getItem('usuario') || 'Bibliotecário'
            );

            notificar(`Usuário "${nome}" cadastrado com sucesso!`);
            renderUsuarios();
        });

        document.getElementById('btn-voltar-usuarios').addEventListener('click', renderUsuarios);
    }

    // 2. RELATÓRIO
    async function renderRelatorio() {
        await aguardarBanco();
        const logs = await db.logs.toArray();
        logs.sort((a, b) => new Date(b.data) - new Date(a.data));

        let html = `<div class="card"><h3>📋 Últimas Movimentações</h3>`;
        if (logs.length === 0) {
            html += `<p>Nenhuma movimentação registrada ainda.</p>`;
        } else {
            html += `<table>
                <thead><tr>
                    <th>Data/Hora</th>
                    <th>Evento</th>
                    <th>Cliente</th>
                    <th>Livro</th>
                    <th>Bibliotecário</th>
                </tr></thead>
                <tbody>`;
            logs.slice(0, 50).forEach(log => {
                const data = new Date(log.data);
                const dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

                let tipoLabel = '';
                switch (log.tipo) {
                    case 'aluguel': tipoLabel = '📤 Aluguel'; break;
                    case 'devolucao': tipoLabel = '📥 Devolução'; break;
                    case 'adicao_livro': tipoLabel = '➕ Adição de Livro'; break;
                    case 'edicao_livro': tipoLabel = '✏️ Edição de Livro'; break;
                    case 'exclusao_livro': tipoLabel = '🗑️ Exclusão de Livro'; break;
                    case 'exclusao_usuario': tipoLabel = '🗑️ Exclusão de Usuário'; break;
                    case 'criacao_usuario': tipoLabel = '➕ Criação de Usuário'; break;
                    case 'solicitacao_aceita': tipoLabel = '✅ Solicitação Aceita'; break;
                    case 'solicitacao_recusada': tipoLabel = '❌ Solicitação Recusada'; break;
                    default: tipoLabel = log.tipo;
                }

                const cliente = log.cliente_nome || '—';
                const livro = log.livro || '—';
                const bibliotecario = log.bibliotecario || 'Sistema';

                html += `<tr>
                    <td>${dataStr}</td>
                    <td>${tipoLabel}</td>
                    <td>${cliente}</td>
                    <td>${livro}</td>
                    <td><strong>${bibliotecario}</strong></td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `</div>`;
        contentArea.innerHTML = html;
    }

    // 3. CATÁLOGO
    async function renderCatalogo() {
        await aguardarBanco();
        const livros = await db.livros.toArray();
        livros.sort((a, b) => a.titulo.localeCompare(b.titulo));

        let html = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
                    <h3 style="margin:0;">📚 Catálogo de Livros</h3>
                    <div style="display:flex; gap:8px; flex:1; max-width:400px; min-width:180px;">
                        <input type="text" id="pesquisa-catalogo" placeholder="🔍 Pesquisar livro..." style="flex:1; padding:8px 14px; border:1px solid var(--border-color); border-radius:6px; font-size:0.95rem; background:var(--input-bg); color:var(--text-primary);">
                        <button id="btn-limpar-pesquisa" style="padding:8px 12px; background:var(--btn-danger); color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.8rem;">✕</button>
                    </div>
                </div>
                <div id="tabela-catalogo-container"></div>
            </div>
        `;

        contentArea.innerHTML = html;

        function renderizarTabela(lista) {
            const container = document.getElementById('tabela-catalogo-container');
            if (!container) return;
            if (lista.length === 0) {
                container.innerHTML = `<p style="padding:20px; text-align:center; color:var(--text-secondary);">Nenhum livro encontrado.</p>`;
                return;
            }
            let tabela = `<table>
                <thead><tr>
                    <th>Título</th>
                    <th>Autor</th>
                    <th>Ano</th>
                    <th>Editora</th>
                    <th>Gênero</th>
                    <th>Classificação</th>
                    <th>Ações</th>
                </tr></thead>
                <tbody>`;
            lista.forEach(livro => {
                tabela += `<tr data-id="${livro.id}">
                    <td>${livro.titulo}</td>
                    <td>${livro.autor}</td>
                    <td>${livro.ano}</td>
                    <td>${livro.editora}</td>
                    <td>${livro.genero || '—'}</td>
                    <td>${livro.classificacao || 'Livre'}</td>
                    <td>
                        <button onclick="abrirModalEditarLivro(${livro.id})" style="background:#3498db; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">✏️ Editar</button>
                        <button onclick="excluirLivro(${livro.id}, '${livro.titulo.replace(/'/g, "\\'")}')" style="background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin-left:4px;">🗑️ Excluir</button>
                    </td>
                </tr>`;
            });
            tabela += `</tbody></table>`;
            container.innerHTML = tabela;
        }

        renderizarTabela(livros);

        const inputPesquisa = document.getElementById('pesquisa-catalogo');
        const btnLimpar = document.getElementById('btn-limpar-pesquisa');

        inputPesquisa.addEventListener('input', function() {
            const termo = this.value.trim().toLowerCase();
            if (termo === '') { renderizarTabela(livros); return; }
            const filtrados = livros.filter(l => 
                l.titulo.toLowerCase().includes(termo) ||
                l.autor.toLowerCase().includes(termo) ||
                (l.genero && l.genero.toLowerCase().includes(termo))
            );
            renderizarTabela(filtrados);
        });

        btnLimpar.addEventListener('click', () => {
            inputPesquisa.value = '';
            renderizarTabela(livros);
            inputPesquisa.focus();
        });
    }

    // 4. ADICIONAR LIVROS
    async function renderAdicionarLivros() {
        await aguardarBanco();
        let html = `
            <div class="card">
                <h3>➕ Adicionar Novo Livro</h3>
                <form id="form-adicionar-livro">
                    <div><label for="novo-titulo">Título</label><input type="text" id="novo-titulo" placeholder="Nome do livro" required></div>
                    <div><label for="novo-autor">Autor</label><input type="text" id="novo-autor" placeholder="Nome do autor" required></div>
                    <div><label for="novo-ano">Ano</label><input type="number" id="novo-ano" placeholder="Ano de publicação" min="1000" max="2099" required></div>
                    <div><label for="novo-editora">Editora</label><input type="text" id="novo-editora" placeholder="Editora" required></div>
                    <div><label for="novo-genero">Gênero</label><input type="text" id="novo-genero" placeholder="Ex: Ficção, Fantasia, Terror"></div>
                    <div><label for="novo-classificacao">Classificação indicativa</label><input type="text" id="novo-classificacao" placeholder="Ex: Livre, 12+, 16+"></div>
                    <div class="full-width"><label for="novo-sinopse">Sinopse</label><textarea id="novo-sinopse" rows="3" placeholder="Breve descrição do livro..."></textarea></div>
                    <div class="full-width">
                        <label for="novo-capa">URL da capa (opcional)</label>
                        <input type="text" id="novo-capa" placeholder="https://exemplo.com/capa.jpg">
                        <input type="file" id="novo-capa-upload" accept="image/*" style="margin-top:8px;">
                        <div id="preview-novo-capa-container" style="margin-top:8px; display:none;">
                            <img id="preview-novo-capa" src="#" alt="Pré-visualização" style="max-width:120px; max-height:160px; border-radius:4px; border:1px solid #ddd;">
                            <button type="button" onclick="document.getElementById('novo-capa').value=''; document.getElementById('preview-novo-capa-container').style.display='none';" style="background:#e74c3c; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin-left:8px;">Remover</button>
                        </div>
                    </div>
                    <div class="full-width"><button type="submit">Adicionar Livro</button></div>
                </form>
            </div>
            <div class="card">
                <h3>📚 Últimos Livros Adicionados</h3>
                <div id="ultimos-livros-adicionados"><p>Carregando...</p></div>
            </div>
        `;
        contentArea.innerHTML = html;

        // Pré-visualização da capa
        const inputCapa = document.getElementById('novo-capa');
        const inputUpload = document.getElementById('novo-capa-upload');
        const previewContainer = document.getElementById('preview-novo-capa-container');
        const previewImg = document.getElementById('preview-novo-capa');

        function atualizarPreview(url) {
            if (url && url.trim() !== '') {
                previewImg.src = url;
                previewContainer.style.display = 'block';
            } else {
                previewContainer.style.display = 'none';
            }
        }

        inputCapa.addEventListener('input', () => atualizarPreview(inputCapa.value));
        inputUpload.addEventListener('change', function(e) {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const dataUrl = ev.target.result;
                    inputCapa.value = dataUrl;
                    atualizarPreview(dataUrl);
                };
                reader.readAsDataURL(file);
            }
        });

        async function carregarUltimosLivros() {
            const livros = await db.livros.toArray();
            const ultimos = livros.sort((a, b) => b.id - a.id).slice(0, 5);
            const container = document.getElementById('ultimos-livros-adicionados');
            if (ultimos.length === 0) {
                container.innerHTML = '<p>Nenhum livro cadastrado ainda.</p>';
                return;
            }
            let tabela = `<table><thead><tr><th>Título</th><th>Autor</th><th>Ano</th><th>Editora</th></tr></thead><tbody>`;
            ultimos.forEach(l => {
                tabela += `<tr><td>${l.titulo}</td><td>${l.autor}</td><td>${l.ano}</td><td>${l.editora}</td></tr>`;
            });
            tabela += `</tbody></table>`;
            container.innerHTML = tabela;
        }
        carregarUltimosLivros();

        document.getElementById('form-adicionar-livro').addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('novo-titulo').value.trim();
            const autor = document.getElementById('novo-autor').value.trim();
            const ano = parseInt(document.getElementById('novo-ano').value);
            const editora = document.getElementById('novo-editora').value.trim();
            const genero = document.getElementById('novo-genero').value.trim();
            const classificacao = document.getElementById('novo-classificacao').value.trim();
            const sinopse = document.getElementById('novo-sinopse').value.trim();
            const capa = document.getElementById('novo-capa').value.trim();

            if (!titulo || !autor || !ano || !editora) {
                notificar('Preencha todos os campos obrigatórios.', 'erro');
                return;
            }

            const existente = await db.livros.where('titulo').equals(titulo).first();
            if (existente) {
                notificar('Já existe um livro com este título.', 'erro');
                return;
            }

            await db.livros.add({
                titulo, autor, ano, editora,
                genero: genero || '',
                classificacao: classificacao || 'Livre',
                sinopse: sinopse || 'Sinopse não disponível.',
                capa: capa || ''
            });

            await registrarLog(
                'adicao_livro',
                null,
                null,
                titulo,
                sessionStorage.getItem('usuario') || 'Bibliotecário'
            );

            notificar(`Livro "${titulo}" adicionado com sucesso.`);
            document.getElementById('form-adicionar-livro').reset();
            document.getElementById('preview-novo-capa-container').style.display = 'none';
            carregarUltimosLivros();
        });
    }

    // ================================================================
    // EDITAR LIVROS (modal)
    // ================================================================
    window.abrirModalEditarLivro = async function(id) {
        const livro = await db.livros.get(id);
        if (!livro) return;

        const existente = document.getElementById('modal-editar-livro');
        if (existente) existente.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-editar-livro';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(4px);';
        modal.innerHTML = `
            <div style="background:#fff; padding:28px; border-radius:8px; max-width:600px; width:90%; max-height:90vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="margin:0;">✏️ Editar Livro</h3>
                    <button onclick="this.closest('#modal-editar-livro').remove()" style="background:none; border:none; font-size:1.8rem; cursor:pointer; color:#999;">&times;</button>
                </div>
                <form id="form-editar-livro">
                    <input type="hidden" id="edit-livro-id" value="${livro.id}">
                    <div><label>Título</label><input type="text" id="edit-titulo" value="${livro.titulo}" required></div>
                    <div><label>Autor</label><input type="text" id="edit-autor" value="${livro.autor}" required></div>
                    <div><label>Ano</label><input type="number" id="edit-ano" value="${livro.ano}" required></div>
                    <div><label>Editora</label><input type="text" id="edit-editora" value="${livro.editora}" required></div>
                    <div><label>Gênero</label><input type="text" id="edit-genero" value="${livro.genero || ''}"></div>
                    <div><label>Classificação</label><input type="text" id="edit-classificacao" value="${livro.classificacao || ''}"></div>
                    <div><label>Sinopse</label><textarea id="edit-sinopse" rows="4">${livro.sinopse || ''}</textarea></div>
                    <div style="border-top:1px solid #eee; padding-top:16px;">
                        <label>📷 URL da capa</label>
                        <input type="text" id="edit-capa" value="${livro.capa || ''}" placeholder="https://exemplo.com/capa.jpg">
                        <input type="file" id="edit-capa-upload" accept="image/*" style="margin-top:8px;">
                        <div id="preview-capa-container" style="margin-top:8px; ${livro.capa ? '' : 'display:none;'}">
                            <img id="preview-capa" src="${livro.capa || ''}" style="max-width:120px; max-height:160px; border-radius:4px; border:1px solid #ddd;">
                            <button type="button" onclick="document.getElementById('edit-capa').value=''; document.getElementById('preview-capa-container').style.display='none';" style="background:#e74c3c; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin-left:8px;">Remover</button>
                        </div>
                    </div>
                    <button type="submit" style="background:#27ae60; color:#fff; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:600;">💾 Salvar</button>
                    <button type="button" onclick="this.closest('#modal-editar-livro').remove()" style="background:#95a5a6; color:#fff; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:600; margin-left:8px;">Cancelar</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const inputCapa = document.getElementById('edit-capa');
        const inputUpload = document.getElementById('edit-capa-upload');
        const previewContainer = document.getElementById('preview-capa-container');
        const previewImg = document.getElementById('preview-capa');

        function atualizarPreview(url) {
            if (url && url.trim() !== '') {
                previewImg.src = url;
                previewContainer.style.display = 'block';
            } else {
                previewContainer.style.display = 'none';
            }
        }

        inputCapa.addEventListener('input', () => atualizarPreview(inputCapa.value));
        inputUpload.addEventListener('change', function(e) {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const dataUrl = ev.target.result;
                    inputCapa.value = dataUrl;
                    atualizarPreview(dataUrl);
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('form-editar-livro').addEventListener('submit', async (e) => {
            e.preventDefault();
            const livroId = parseInt(document.getElementById('edit-livro-id').value);
            const titulo = document.getElementById('edit-titulo').value.trim();
            const autor = document.getElementById('edit-autor').value.trim();
            const ano = parseInt(document.getElementById('edit-ano').value);
            const editora = document.getElementById('edit-editora').value.trim();
            const genero = document.getElementById('edit-genero').value.trim();
            const classificacao = document.getElementById('edit-classificacao').value.trim();
            const sinopse = document.getElementById('edit-sinopse').value.trim();
            const capa = document.getElementById('edit-capa').value.trim();

            if (!titulo || !autor || !ano || !editora) {
                notificar('Preencha todos os campos obrigatórios.', 'erro');
                return;
            }

            const existente = await db.livros.where('titulo').equals(titulo).first();
            if (existente && existente.id !== livroId) {
                notificar('Já existe um livro com este título.', 'erro');
                return;
            }

            await db.livros.update(livroId, {
                titulo, autor, ano, editora,
                genero: genero || '',
                classificacao: classificacao || 'Livre',
                sinopse: sinopse || 'Sinopse não disponível.',
                capa: capa || ''
            });

            await registrarLog(
                'edicao_livro',
                null,
                null,
                titulo,
                sessionStorage.getItem('usuario') || 'Bibliotecário'
            );

            modal.remove();
            notificar(`Livro "${titulo}" atualizado com sucesso!`);
            renderCatalogo();
        });
    };

    window.excluirLivro = async function(id, titulo) {
        if (!confirm(`Tem certeza que deseja excluir "${titulo}"? Esta ação é irreversível.`)) return;
        const aluguelAtivo = await db.alugueis.where('livro').equals(titulo).filter(a => a.status === 'ativo').first();
        if (aluguelAtivo) {
            notificar('Este livro possui um aluguel ativo. Não pode ser excluído.', 'erro');
            return;
        }
        await db.livros.delete(id);

        await registrarLog(
            'exclusao_livro',
            null,
            null,
            titulo,
            sessionStorage.getItem('usuario') || 'Bibliotecário'
        );

        notificar(`Livro "${titulo}" excluído com sucesso.`);
        renderCatalogo();
    };

    // 5. ALUGAR (admin direto)
    async function renderAlugar() {
        await aguardarBanco();
        const clientes = await db.clientes.toArray();
        const livros = await db.livros.toArray();

        let html = `<div class="card"><h3>📤 Realizar Aluguel</h3>
            <form id="form-alugar">
                <div><label for="cliente-alugar">Cliente</label>
                    <select id="cliente-alugar" required><option value="">Selecione...</option>`;
        clientes.forEach(c => {
            html += `<option value="${c.id}">${c.nome} (${c.cpf})</option>`;
        });
        html += `</select></div>
                <div><label for="livro-alugar">Livro</label>
                    <select id="livro-alugar" required><option value="">Selecione...</option>`;
        livros.forEach(l => {
            html += `<option value="${l.titulo}">${l.titulo}</option>`;
        });
        html += `</select></div>
                <div><label for="data-locacao">Data de Locação</label><input type="date" id="data-locacao" required></div>
                <div><label for="data-devolucao-prevista">Devolução Prevista (+7 dias)</label>
                    <input type="text" id="data-devolucao-prevista" readonly placeholder="Automático">
                    <input type="hidden" id="data-devolucao-prevista-iso">
                </div>
                <div class="full-width"><button type="submit">Confirmar Aluguel</button></div>
            </form>
        </div>`;
        contentArea.innerHTML = html;

        document.getElementById('data-locacao').addEventListener('change', function() {
            const data = new Date(this.value + 'T00:00:00');
            if (!isNaN(data)) {
                data.setDate(data.getDate() + 7);
                document.getElementById('data-devolucao-prevista').value = data.toLocaleDateString('pt-BR');
                document.getElementById('data-devolucao-prevista-iso').value = data.toISOString().split('T')[0];
            }
        });

        document.getElementById('form-alugar').addEventListener('submit', async (e) => {
            e.preventDefault();
            const clienteId = parseInt(document.getElementById('cliente-alugar').value);
            const livroTitulo = document.getElementById('livro-alugar').value;
            const dataLocacao = document.getElementById('data-locacao').value;
            const dataDevolucaoPrevista = document.getElementById('data-devolucao-prevista-iso').value;

            if (!clienteId || !livroTitulo || !dataLocacao || !dataDevolucaoPrevista) {
                notificar('Preencha todos os campos.', 'erro');
                return;
            }

            const aluguelAtivo = await db.alugueis.where('cliente_id').equals(clienteId).filter(a => a.status === 'ativo').first();
            if (aluguelAtivo) {
                notificar('Cliente já possui um livro alugado.', 'erro');
                return;
            }

            const livroAlugado = await db.alugueis.where('livro').equals(livroTitulo).filter(a => a.status === 'ativo').first();
            if (livroAlugado) {
                notificar('Este livro já está alugado.', 'erro');
                return;
            }

            const cliente = await db.clientes.get(clienteId);
            await db.alugueis.add({
                cliente_id: clienteId,
                livro: livroTitulo,
                data_locacao: dataLocacao,
                data_devolucao_prevista: dataDevolucaoPrevista,
                status: 'ativo'
            });

            await registrarLog(
                'aluguel',
                clienteId,
                cliente ? cliente.nome : 'Desconhecido',
                livroTitulo,
                sessionStorage.getItem('usuario') || 'Bibliotecário'
            );

            notificar(`Aluguel de "${livroTitulo}" realizado com sucesso!`);
            renderAlugar();
        });
    }

    // 6. DEVOLVER (admin direto)
    async function renderDevolver() {
        await aguardarBanco();
        const clientes = await db.clientes.toArray();
        let html = `<div class="card"><h3>📥 Devolução de Livro</h3>
            <form id="form-devolver">
                <div><label for="cliente-devolver">Cliente</label>
                    <select id="cliente-devolver" required><option value="">Selecione...</option>`;
        clientes.forEach(c => {
            html += `<option value="${c.id}">${c.nome} (${c.cpf})</option>`;
        });
        html += `</select></div>
                <div><label for="livro-devolver">Livro Alugado</label>
                    <select id="livro-devolver" required disabled><option value="">Selecione um cliente primeiro</option></select>
                </div>
                <div class="full-width"><button type="submit" class="perigo">Confirmar Devolução</button></div>
            </form>
        </div>`;
        contentArea.innerHTML = html;

        const selectCliente = document.getElementById('cliente-devolver');
        const selectLivro = document.getElementById('livro-devolver');

        selectCliente.addEventListener('change', async function() {
            const clienteId = parseInt(this.value);
            if (!clienteId) {
                selectLivro.disabled = true;
                selectLivro.innerHTML = '<option value="">Selecione um cliente primeiro</option>';
                return;
            }
            const alugueisAtivos = await db.alugueis.where('cliente_id').equals(clienteId).filter(a => a.status === 'ativo').toArray();
            selectLivro.disabled = false;
            selectLivro.innerHTML = '<option value="">Selecione o livro...</option>';
            alugueisAtivos.forEach(a => {
                selectLivro.innerHTML += `<option value="${a.id}">${a.livro}</option>`;
            });
            if (alugueisAtivos.length === 0) {
                selectLivro.innerHTML = '<option value="">Nenhum livro alugado</option>';
                selectLivro.disabled = true;
            }
        });

        document.getElementById('form-devolver').addEventListener('submit', async (e) => {
            e.preventDefault();
            const aluguelId = parseInt(document.getElementById('livro-devolver').value);
            if (!aluguelId) {
                notificar('Selecione um livro para devolver.', 'erro');
                return;
            }
            const aluguel = await db.alugueis.get(aluguelId);
            if (!aluguel || aluguel.status !== 'ativo') {
                notificar('Este aluguel não está ativo.', 'erro');
                return;
            }

            const hoje = new Date().toISOString().split('T')[0];
            let diasAtraso = 0, multa = 0;
            if (aluguel.data_devolucao_prevista) {
                const prevista = new Date(aluguel.data_devolucao_prevista + 'T00:00:00');
                const real = new Date(hoje + 'T00:00:00');
                if (real > prevista) {
                    const diffMs = real - prevista;
                    diasAtraso = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    multa = diasAtraso * MULTA_POR_DIA;
                }
            }

            if (diasAtraso > 0) {
                const confirmado = await exibirModalMulta(diasAtraso, multa);
                if (!confirmado) {
                    notificar('Devolução cancelada.', 'aviso');
                    return;
                }
            } else {
                const confirmado = await exibirModalDevolucaoNormal();
                if (!confirmado) return;
            }

            const cliente = await db.clientes.get(aluguel.cliente_id);
            await db.alugueis.update(aluguelId, {
                status: 'devolvido',
                data_devolucao_real: hoje,
                dias_atraso: diasAtraso,
                multa: multa
            });

            await registrarLog(
                'devolucao',
                aluguel.cliente_id,
                cliente ? cliente.nome : 'Desconhecido',
                aluguel.livro,
                sessionStorage.getItem('usuario') || 'Bibliotecário'
            );

            notificar(`Livro "${aluguel.livro}" devolvido com sucesso! Multa: R$ ${multa.toFixed(2)}.`);
            renderDevolver();
        });
    }

    // ================================================================
    // 7. SOLICITAÇÕES (unificadas: livros + aluguel/devolução)
    // ================================================================
    async function renderSolicitacoes() {
        await aguardarBanco();

        // Busca solicitações de livros (sugestões de novos títulos)
        const solicitacoesLivros = await db.solicitacoes.toArray();
        const clientes = await db.clientes.toArray();
        const mapaClientes = {};
        clientes.forEach(c => { mapaClientes[c.id] = { nome: c.nome, apelido: c.apelido }; });
        solicitacoesLivros.sort((a, b) => new Date(b.data) - new Date(a.data));

        // Busca solicitações de aluguel/devolução pendentes
        const solicitacoesAluguel = await db.solicitacoes_aluguel
            .where('status').equals('pendente')
            .toArray();
        solicitacoesAluguel.sort((a, b) => new Date(b.data_solicitacao) - new Date(a.data_solicitacao));

        let html = `<div class="card"><h3>📩 Solicitações de Livros (Sugestões)</h3>`;
        if (solicitacoesLivros.length === 0) {
            html += `<p>Nenhuma sugestão de livro enviada.</p>`;
        } else {
            html += `<table>
                <thead><tr><th>Usuário</th><th>Título</th><th>Autor</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;
            solicitacoesLivros.forEach(s => {
                const usuario = mapaClientes[s.usuario_id] || { nome: 'Desconhecido', apelido: '' };
                const nomeUsuario = usuario.apelido || usuario.nome;
                const data = new Date(s.data).toLocaleDateString('pt-BR');
                const statusTexto = s.status === 'atendido' ? 'Atendido' : 'Pendente';
                const statusClass = s.status === 'atendido' ? 'status-ativo' : '';
                html += `<tr>
                    <td>${nomeUsuario}</td>
                    <td style="cursor:pointer; color:var(--btn-primary); text-decoration:underline;" onclick="verDetalhesSolicitacao(${s.id})">${s.titulo}</td>
                    <td>${s.autor || '—'}</td>
                    <td>${data}</td>
                    <td class="${statusClass}">${statusTexto}</td>
                    <td>
                        ${s.status === 'pendente' ? `<button onclick="atenderSolicitacao(${s.id})" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">✅ Atender</button>` : '—'}
                    </td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `</div>`;

        // ===== SEÇÃO DE SOLICITAÇÕES DE ALUGUEL/DEVOLUÇÃO =====
        html += `<div class="card"><h3>📋 Solicitações de Aluguel/Devolução (Pendentes)</h3>`;
        if (solicitacoesAluguel.length === 0) {
            html += `<p>Nenhuma solicitação pendente.</p>`;
        } else {
            html += `<table>
                <thead><tr>
                    <th>Usuário</th>
                    <th>Tipo</th>
                    <th>Livro</th>
                    <th>Data Solicitação</th>
                    <th>Multa (se devolução)</th>
                    <th>Ações</th>
                </tr></thead><tbody>`;
            for (const sol of solicitacoesAluguel) {
                const usuario = mapaClientes[sol.cliente_id] || { nome: 'Desconhecido', apelido: '' };
                const nomeUsuario = usuario.apelido || usuario.nome;
                const data = new Date(sol.data_solicitacao).toLocaleDateString('pt-BR') + ' ' + new Date(sol.data_solicitacao).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                const tipoLabel = sol.tipo === 'aluguel' ? '📤 Aluguel' : '📥 Devolução';
                const multaExibicao = sol.multa_calculada ? `R$ ${sol.multa_calculada.toFixed(2)}` : '—';

                html += `<tr>
                    <td>${nomeUsuario}</td>
                    <td>${tipoLabel}</td>
                    <td>${sol.livro}</td>
                    <td>${data}</td>
                    <td>${multaExibicao}</td>
                    <td>
                        <button onclick="aceitarSolicitacaoAluguel(${sol.id})" style="background:#27ae60; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">✅ Aceitar</button>
                        <button onclick="recusarSolicitacaoAluguel(${sol.id})" style="background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin-left:4px;">❌ Recusar</button>
                    </td>
                </tr>`;
            }
            html += `</tbody></table>`;
        }
        html += `</div>`;

        contentArea.innerHTML = html;

        // ===== FUNÇÕES DE ACEITAR/RECUSAR (globais) =====
        window.aceitarSolicitacaoAluguel = async function(id) {
            const sol = await db.solicitacoes_aluguel.get(id);
            if (!sol) return;

            const bibliotecario = sessionStorage.getItem('usuario') || 'Bibliotecário';

            if (sol.tipo === 'aluguel') {
                // Verifica se o livro ainda está disponível
                const livroAlugado = await db.alugueis.where('livro').equals(sol.livro).filter(a => a.status === 'ativo').first();
                if (livroAlugado) {
                    notificar('Este livro já foi alugado por outro usuário.', 'erro');
                    return;
                }

                // Cria o aluguel
                await db.alugueis.add({
                    cliente_id: sol.cliente_id,
                    livro: sol.livro,
                    data_locacao: sol.data_locacao,
                    data_devolucao_prevista: sol.data_devolucao_prevista,
                    status: 'ativo'
                });

                // Notifica o usuário
                await criarNotificacao(
                    sol.cliente_id,
                    `✅ Seu pedido para alugar o livro "${sol.livro}" foi aceito. Vá até a Booksy mais próxima e retire seu livro.`,
                    'aluguel'
                );

                // Log
                await registrarLog(
                    'solicitacao_aceita',
                    sol.cliente_id,
                    sol.cliente_nome,
                    sol.livro,
                    bibliotecario
                );

            } else if (sol.tipo === 'devolucao') {
                // Busca o aluguel ativo correspondente
                const aluguel = await db.alugueis
                    .where('cliente_id').equals(sol.cliente_id)
                    .and(a => a.livro === sol.livro && a.status === 'ativo')
                    .first();

                if (!aluguel) {
                    notificar('Aluguel não encontrado para este livro.', 'erro');
                    return;
                }

                // Calcula multa novamente (por segurança)
                const hoje = new Date().toISOString().split('T')[0];
                let diasAtraso = 0, multa = 0;
                if (aluguel.data_devolucao_prevista) {
                    const prevista = new Date(aluguel.data_devolucao_prevista + 'T00:00:00');
                    const real = new Date(hoje + 'T00:00:00');
                    if (real > prevista) {
                        const diffMs = real - prevista;
                        diasAtraso = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        multa = diasAtraso * MULTA_POR_DIA;
                    }
                }

                await db.alugueis.update(aluguel.id, {
                    status: 'devolvido',
                    data_devolucao_real: hoje,
                    dias_atraso: diasAtraso,
                    multa: multa
                });

                // Notifica o usuário
                const multaMsg = multa > 0 ? ` Lembre-se de pagar a multa de R$ ${multa.toFixed(2)}.` : '';
                await criarNotificacao(
                    sol.cliente_id,
                    `✅ Seu pedido para devolver o livro "${sol.livro}" foi aceito.${multaMsg}`,
                    'devolucao'
                );

                // Log
                await registrarLog(
                    'solicitacao_aceita',
                    sol.cliente_id,
                    sol.cliente_nome,
                    sol.livro,
                    bibliotecario
                );
            }

            // Atualiza status da solicitação
            await db.solicitacoes_aluguel.update(id, {
                status: 'aceito',
                bibliotecario: bibliotecario
            });

            notificar('Solicitação aceita com sucesso!');
            renderSolicitacoes(); // recarrega
        };

        window.recusarSolicitacaoAluguel = async function(id) {
            const sol = await db.solicitacoes_aluguel.get(id);
            if (!sol) return;

            const bibliotecario = sessionStorage.getItem('usuario') || 'Bibliotecário';

            // Notifica o usuário
            await criarNotificacao(
                sol.cliente_id,
                `❌ Seu pedido para ${sol.tipo === 'aluguel' ? 'alugar' : 'devolver'} o livro "${sol.livro}" foi recusado.`,
                'sistema'
            );

            // Log
            await registrarLog(
                'solicitacao_recusada',
                sol.cliente_id,
                sol.cliente_nome,
                sol.livro,
                bibliotecario
            );

            // Atualiza status
            await db.solicitacoes_aluguel.update(id, {
                status: 'recusado',
                bibliotecario: bibliotecario
            });

            notificar('Solicitação recusada.');
            renderSolicitacoes();
        };
    }

    // ===== FUNÇÕES PARA SOLICITAÇÕES DE LIVROS (sugestões) =====
    window.verDetalhesSolicitacao = async function(id) {
        const solicitacao = await db.solicitacoes.get(id);
        if (!solicitacao) return;
        const clientes = await db.clientes.toArray();
        const usuario = clientes.find(c => c.id === solicitacao.usuario_id) || {};
        const nomeUsuario = usuario.apelido || usuario.nome || 'Desconhecido';
        const fotoUrl = usuario.foto || 'static/src/avatares/usuario.jpg';
        const data = new Date(solicitacao.data).toLocaleDateString('pt-BR');
        const status = solicitacao.status === 'atendido' ? '✅ Atendido' : '⏳ Pendente';

        const existente = document.getElementById('modal-detalhes-solicitacao');
        if (existente) existente.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-detalhes-solicitacao';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
        modal.innerHTML = `
            <div style="background:#fff; padding:24px; border-radius:8px; max-width:500px; width:90%; max-height:80vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="margin:0;">📖 Detalhes da Solicitação</h3>
                    <button onclick="this.closest('#modal-detalhes-solicitacao').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-secondary);">&times;</button>
                </div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                    <img src="${fotoUrl}" alt="${nomeUsuario}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" onerror="this.src='static/src/avatares/usuario.jpg'">
                    <div><strong>${nomeUsuario}</strong><br><small>${data} • ${status}</small></div>
                </div>
                <div><strong>Título:</strong> ${solicitacao.titulo}</div>
                ${solicitacao.autor ? `<div><strong>Autor:</strong> ${solicitacao.autor}</div>` : ''}
                ${solicitacao.editora ? `<div><strong>Editora:</strong> ${solicitacao.editora}</div>` : ''}
                ${solicitacao.comentario ? `<div style="background:#f8f9fa; padding:12px; border-radius:6px; margin-bottom:16px;"><strong>Comentário:</strong><p style="margin:8px 0 0; color:#555; font-style:italic;">"${solicitacao.comentario}"</p></div>` : ''}
                ${solicitacao.resposta ? `<div style="background:#e8f5e9; padding:12px; border-radius:6px; margin-bottom:16px; border-left:4px solid #27ae60;"><strong>📬 Resposta:</strong><p style="margin:8px 0 0; color:#2e7d32;">${solicitacao.resposta}</p></div>` : ''}
                <div style="margin-top:12px;">
                    <label for="resposta-admin" style="display:block; margin-bottom:4px; font-weight:600;">Responder ao usuário:</label>
                    <textarea id="resposta-admin" rows="3" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" placeholder="Escreva uma resposta...">${solicitacao.resposta || ''}</textarea>
                    <button onclick="enviarResposta(${solicitacao.id})" style="margin-top:8px; background:#2196F3; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">✉️ Enviar Resposta</button>
                </div>
                ${solicitacao.status === 'pendente' ? `<button onclick="atenderSolicitacao(${solicitacao.id}); document.getElementById('modal-detalhes-solicitacao').remove();" style="background:#27ae60; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin-top:12px;">✅ Atender</button>` : ''}
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
    };

    window.atenderSolicitacao = async function(id) {
        await db.solicitacoes.update(id, { status: 'atendido' });
        notificar('Solicitação atendida.');
        renderSolicitacoes();
    };

    window.enviarResposta = async function(id) {
        const resposta = document.getElementById('resposta-admin').value.trim();
        if (!resposta) {
            notificar('Escreva uma resposta.', 'erro');
            return;
        }
        await db.solicitacoes.update(id, { resposta: resposta });
        // Cria notificação para o usuário
        const solicitacao = await db.solicitacoes.get(id);
        if (solicitacao) {
            await criarNotificacao(
                solicitacao.usuario_id,
                `📬 Resposta para sua solicitação de livro "${solicitacao.titulo}": ${resposta}`,
                'sistema'
            );
        }
        notificar('Resposta enviada!');
        document.getElementById('modal-detalhes-solicitacao').remove();
        renderSolicitacoes();
    };

    // ============================================================
    // AUXILIARES
    // ============================================================
    function notificar(mensagem, tipo = 'sucesso') {
        const notif = document.getElementById('notificacao');
        if (!notif) return;
        notif.textContent = mensagem;
        notif.className = 'notificacao ' + (tipo === 'erro' ? 'erro' : '');
        notif.style.display = 'block';
        setTimeout(() => { notif.style.display = 'none'; }, 4000);
    }

    // ============================================================
    // LOGIN
    // ============================================================
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const user = document.getElementById('login-user').value.trim();
        const pass = document.getElementById('login-pass').value.trim();

        const valido = BIBLIOTECARIOS.some(b => b.usuario === user && b.senha === pass);

        if (valido) {
            sessionStorage.setItem('logado', 'true');
            sessionStorage.setItem('perfil', 'bibliotecario');
            sessionStorage.setItem('usuario', user);
            loginModal.style.display = 'none';
            adminNomeSpan.textContent = user;
            loginError.style.display = 'none';
            document.getElementById('login-form').reset();
            const defaultLink = document.querySelector('a[data-section="usuarios"]');
            if (defaultLink) defaultLink.click();
        } else {
            loginError.style.display = 'block';
        }
    });

    // ============================================================
    // TEMA
    // ============================================================
    const temaBtn = document.getElementById('tema-btn');
    if (temaBtn) {
        const temaSalvo = localStorage.getItem('tema-admin') || 'claro';
        if (temaSalvo === 'escuro') {
            document.body.classList.add('tema-escuro');
            temaBtn.textContent = '☀️';
        }
        temaBtn.addEventListener('click', function() {
            document.body.classList.toggle('tema-escuro');
            const isEscuro = document.body.classList.contains('tema-escuro');
            this.textContent = isEscuro ? '☀️' : '🌙';
            localStorage.setItem('tema-admin', isEscuro ? 'escuro' : 'claro');
        });
    }

    // ============================================================
    // LOGOUT
    // ============================================================
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    // ============================================================
    // NAVEGAÇÃO
    // ============================================================
    const menuLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            if (sessionStorage.getItem('logado') !== 'true') {
                notificar('Você precisa estar logado para acessar.', 'erro');
                return;
            }

            const section = this.getAttribute('data-section');
            const titles = {
                'usuarios': 'Usuários',
                'catalogo': 'Catálogo',
                'adicionar-livros': 'Adicionar Livros',
                'alugar': 'Alugar Livro',
                'devolver': 'Devolver',
                'relatorio': 'Relatório',
                'solicitacoes': 'Solicitações'
            };
            sectionTitle.textContent = titles[section] || section;

            menuLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            switch (section) {
                case 'usuarios': renderUsuarios(); break;
                case 'catalogo': renderCatalogo(); break;
                case 'adicionar-livros': renderAdicionarLivros(); break;
                case 'alugar': renderAlugar(); break;
                case 'devolver': renderDevolver(); break;
                case 'relatorio': renderRelatorio(); break;
                case 'solicitacoes': renderSolicitacoes(); break;
                default: contentArea.innerHTML = '<p>Seção em desenvolvimento.</p>';
            }
        });
    });

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    if (sessionStorage.getItem('logado') === 'true' && sessionStorage.getItem('perfil') === 'bibliotecario') {
        loginModal.style.display = 'none';
        adminNomeSpan.textContent = sessionStorage.getItem('usuario');
        const defaultLink = document.querySelector('a[data-section="usuarios"]');
        if (defaultLink) defaultLink.click();
    } else {
        loginModal.style.display = 'flex';
        contentArea.innerHTML = '<p>Faça login para acessar o sistema.</p>';
        adminNomeSpan.textContent = 'Desconectado';
        sessionStorage.removeItem('logado');
        sessionStorage.removeItem('perfil');
        sessionStorage.removeItem('usuario');
    }
});