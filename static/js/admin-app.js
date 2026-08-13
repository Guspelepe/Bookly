// ============================================================
// admin-app.js – Painel do bibliotecário 
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin app iniciado.');

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
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
                <h3 style="margin:0; border-bottom:none; padding-bottom:0;">Usuários Cadastrados</h3>
                <div style="display:flex; gap:8px; flex:1; max-width:400px; min-width:180px;">
                    <input type="text" id="pesquisa-usuarios" placeholder="Pesquisar por nome, apelido ou CPF..." style="flex:1; padding:8px 14px; border:1px solid var(--border-color); border-radius:6px; font-size:0.95rem; background:var(--input-bg); color:var(--text-primary);">
                    <button id="btn-limpar-pesquisa-usuarios" style="padding:8px 12px; background:var(--btn-danger); color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.8rem;">×</button>
                </div>
                <button id="btn-novo-usuario" class="tema-botao-sidebar" style="width:auto; padding:8px 16px; background:var(--btn-primary); color:#fff; border:none; border-radius:4px; cursor:pointer;">Novo Usuário</button>
            </div>
            <div id="tabela-usuarios-container"></div>
        </div>`;

        contentArea.innerHTML = html;

        function renderizarTabelaUsuarios(lista) {
            const container = document.getElementById('tabela-usuarios-container');
            if (!container) return;
            if (lista.length === 0) {
                container.innerHTML = `<p style="padding:20px; text-align:center; color:var(--text-secondary);">Nenhum usuário encontrado.</p>`;
                return;
            }
            let tabela = `<table class="tabela-usuarios">
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
            lista.forEach(c => {
                const livro = mapaAluguel[c.id] || '—';
                const fotoHtml = c.foto 
                    ? `<img src="${c.foto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; display:block; margin:0 auto;">` 
                    : `<div style="width:36px; height:36px; border-radius:50%; background:var(--bg-sidebar); margin:0 auto; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">Foto</div>`;
                tabela += `<tr>
                    <td style="text-align:center; padding:4px;">${fotoHtml}</td>
                    <td style="text-align:left; font-weight:500;">${c.nome}</td>
                    <td style="text-align:left; color:var(--text-secondary);">${c.apelido || '—'}</td>
                    <td style="text-align:center; font-family:monospace;">${c.cpf}</td>
                    <td style="text-align:center;">${livro !== '—' ? `<span class="status-ativo">${livro}</span>` : '—'}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button onclick="resetarSenha(${c.id}, '${c.nome.replace(/'/g, "\\'")}')" style="background:#f39c12; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Senha</button>
                        <button onclick="excluirUsuario(${c.id}, '${c.nome.replace(/'/g, "\\'")}')" style="background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem; margin-left:4px;">Excluir</button>
                    </td>
                </tr>`;
            });
            tabela += `</tbody></table>`;
            container.innerHTML = tabela;
        }

        renderizarTabelaUsuarios(clientes);

        // Filtro de pesquisa
        const inputPesquisa = document.getElementById('pesquisa-usuarios');
        const btnLimpar = document.getElementById('btn-limpar-pesquisa-usuarios');

        inputPesquisa.addEventListener('input', function() {
            const termo = this.value.trim().toLowerCase();
            if (termo === '') {
                renderizarTabelaUsuarios(clientes);
                return;
            }
            const filtrados = clientes.filter(c => 
                c.nome.toLowerCase().includes(termo) ||
                (c.apelido && c.apelido.toLowerCase().includes(termo)) ||
                c.cpf.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
            );
            renderizarTabelaUsuarios(filtrados);
        });

        btnLimpar.addEventListener('click', () => {
            inputPesquisa.value = '';
            renderizarTabelaUsuarios(clientes);
            inputPesquisa.focus();
        });

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
                span.textContent = existente ? 'CPF já cadastrado.' : 'CPF disponível.';
                span.style.color = existente ? '#e74c3c' : '#27ae60';
            } else {
                span.textContent = cpfBruto.length > 0 ? 'CPF inválido.' : '';
                span.style.color = '#e74c3c';
            }
        });

        document.getElementById('apelido').addEventListener('blur', async function() {
            const apelido = this.value.trim();
            const span = document.getElementById('msg-apelido-admin');
            if (!span || !apelido) { if (span) span.textContent = ''; return; }
            await aguardarBanco();
            const existente = await db.clientes.where('apelido').equalsIgnoreCase(apelido).first();
            span.textContent = existente ? 'Apelido já está em uso.' : 'Apelido disponível.';
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

        let html = `<div class="card"><h3>Últimas Movimentações</h3>`;
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
                    case 'aluguel': tipoLabel = 'Aluguel'; break;
                    case 'devolucao': tipoLabel = 'Devolução'; break;
                    case 'adicao_livro': tipoLabel = 'Adição de Livro'; break;
                    case 'edicao_livro': tipoLabel = 'Edição de Livro'; break;
                    case 'exclusao_livro': tipoLabel = 'Exclusão de Livro'; break;
                    case 'exclusao_usuario': tipoLabel = 'Exclusão de Usuário'; break;
                    case 'criacao_usuario': tipoLabel = 'Criação de Usuário'; break;
                    case 'solicitacao_aceita': tipoLabel = 'Solicitação Aceita'; break;
                    case 'solicitacao_recusada': tipoLabel = 'Solicitação Recusada'; break;
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
        livros.sort((a, b) => b.id - a.id); 

        let html = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
                    <h3 style="margin:0;">Catálogo de Livros</h3>
                    <div style="display:flex; gap:8px; flex:1; max-width:400px; min-width:180px;">
                        <input type="text" id="pesquisa-catalogo" placeholder="Pesquisar livro..." style="flex:1; padding:8px 14px; border:1px solid var(--border-color); border-radius:6px; font-size:0.95rem; background:var(--input-bg); color:var(--text-primary);">
                        <button id="btn-limpar-pesquisa" style="padding:8px 12px; background:var(--btn-danger); color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.8rem;">×</button>
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
                        <button onclick="abrirModalEditarLivro(${livro.id})" style="background:#3498db; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Editar</button>
                        <button onclick="excluirLivro(${livro.id}, '${livro.titulo.replace(/'/g, "\\'")}')" style="background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin-left:4px;">Excluir</button>
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
                <h3>Adicionar Novo Livro</h3>
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
                <h3>Últimos Livros Adicionados</h3>
                <div id="ultimos-livros-adicionados"><p>Carregando...</p></div>
            </div>
        `;
        contentArea.innerHTML = html;

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

            const solicitacoesPendentes = await db.solicitacoes
                .where('titulo').equals(titulo)
                .and(s => s.status === 'pendente')
                .toArray();

            for (const sol of solicitacoesPendentes) {
                await criarNotificacao(
                    sol.usuario_id,
                    `O livro "${titulo}" que você solicitou foi adicionado ao catálogo!`,
                    'solicitacao_atendida'
                );
                await db.solicitacoes.update(sol.id, { status: 'atendido' });
            }
            if (solicitacoesPendentes.length > 0) {
                console.log(`${solicitacoesPendentes.length} usuários notificados sobre a adição do livro "${titulo}".`);
            }

            notificar(`Livro "${titulo}" adicionado com sucesso.`);
            document.getElementById('form-adicionar-livro').reset();
            document.getElementById('preview-novo-capa-container').style.display = 'none';
            carregarUltimosLivros();
        });
    }

    // ================================================================
    // EDITAR LIVROS 
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
            <div style="background: var(--bg-card, #fff); color: var(--text-primary, #333); padding:28px; border-radius:8px; max-width:600px; width:90%; max-height:90vh; overflow-y:auto; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="margin:0; color: var(--text-primary, #333);">Editar Livro</h3>
                    <button onclick="this.closest('#modal-editar-livro').remove()" style="background:none; border:none; font-size:1.8rem; cursor:pointer; color: var(--text-secondary, #999);">&times;</button>
                </div>
                <form id="form-editar-livro">
                    <input type="hidden" id="edit-livro-id" value="${livro.id}">
                    <div><label style="color: var(--text-secondary);">Título</label><input type="text" id="edit-titulo" value="${livro.titulo}" required style="background: var(--input-bg, #fff); color: var(--text-primary, #333); border:1px solid var(--border-color, #ddd);"></div>
                    <div><label style="color: var(--text-secondary);">Autor</label><input type="text" id="edit-autor" value="${livro.autor}" required style="background: var(--input-bg, #fff); color: var(--text-primary, #333); border:1px solid var(--border-color, #ddd);"></div>
                    <div><label style="color: var(--text-secondary);">Ano</label><input type="number" id="edit-ano" value="${livro.ano}" required style="background: var(--input-bg, #fff); color: var(--text-primary, #333); border:1px solid var(--border-color, #ddd);"></div>
                    <div><label style="color: var(--text-secondary);">Editora</label><input type="text" id="edit-editora" value="${livro.editora}" required style="background: var(--input-bg, #fff); color: var(--text-primary, #333); border:1px solid var(--border-color, #ddd);"></div>
                    <div><label style="color: var(--text-secondary);">Gênero</label><input type="text" id="edit-genero" value="${livro.genero || ''}" style="background: var(--input-bg, #fff); color: var(--text-primary, #333); border:1px solid var(--border-color, #ddd);"></div>
                    <div><label style="color: var(--text-secondary);">Classificação</label><input type="text" id="edit-classificacao" value="${livro.classificacao || ''}" style="background: var(--input-bg, #fff); color: var(--text-primary, #333); border:1px solid var(--border-color, #ddd);"></div>
                    <div><label style="color: var(--text-secondary);">Sinopse</label><textarea id="edit-sinopse" rows="4" style="background: var(--input-bg, #fff); color: var(--text-primary, #333); border:1px solid var(--border-color, #ddd);">${livro.sinopse || ''}</textarea></div>
                    <div style="border-top:1px solid var(--border-color, #eee); padding-top:16px;">
                        <label style="color: var(--text-secondary);">URL da capa</label>
                        <input type="text" id="edit-capa" value="${livro.capa || ''}" placeholder="https://exemplo.com/capa.jpg" style="background: var(--input-bg, #fff); color: var(--text-primary, #333); border:1px solid var(--border-color, #ddd);">
                        <input type="file" id="edit-capa-upload" accept="image/*" style="margin-top:8px;">
                        <div id="preview-capa-container" style="margin-top:8px; ${livro.capa ? '' : 'display:none;'}">
                            <img id="preview-capa" src="${livro.capa || ''}" style="max-width:120px; max-height:160px; border-radius:4px; border:1px solid var(--border-color, #ddd);">
                            <button type="button" onclick="document.getElementById('edit-capa').value=''; document.getElementById('preview-capa-container').style.display='none';" style="background:#e74c3c; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin-left:8px;">Remover</button>
                        </div>
                    </div>
                    <button type="submit" style="background:#27ae60; color:#fff; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:600; border:none;">Salvar</button>
                    <button type="button" onclick="this.closest('#modal-editar-livro').remove()" style="background:#95a5a6; color:#fff; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:600; border:none; margin-left:8px;">Cancelar</button>
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

    // 5. ALUGAR 
    async function renderAlugar() {
        await aguardarBanco();
        const clientes = await db.clientes.toArray();
        const livros = await db.livros.toArray();

        let html = `<div class="card"><h3>Realizar Aluguel</h3>
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

            if (cliente) {
                await criarNotificacao(
                    clienteId,
                    `Seu aluguel do livro "${livroTitulo}" foi realizado pelo bibliotecário.`,
                    'aluguel'
                );
            }

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

    // 6. DEVOLVER 
    async function renderDevolver() {
        await aguardarBanco();
        const clientes = await db.clientes.toArray();
        let html = `<div class="card"><h3>Devolução de Livro</h3>
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

            if (cliente) {
                await criarNotificacao(
                    aluguel.cliente_id,
                    `Sua devolução do livro "${aluguel.livro}" foi registrada pelo bibliotecário.`,
                    'devolucao'
                );
            }

            await registrarLog(
                'devolucao',
                aluguel.cliente_id,
                cliente ? cliente.nome : 'Desconhecido',
                aluguel.livro,
                sessionStorage.getItem('usuario') || 'Bibliotecário'
            );

            const livro = await db.livros.where('titulo').equals(aluguel.livro).first();
            if (livro) {
                const avisosPendentes = await db.avisos_disponibilidade
                    .where('livro_id').equals(livro.id)
                    .and(a => a.status === 'pendente')
                    .toArray();
                for (const aviso of avisosPendentes) {
                    await criarNotificacao(
                        aviso.usuario_id,
                        `O livro "${aluguel.livro}" que você aguardava está disponível!`,
                        'disponibilidade'
                    );
                    await db.avisos_disponibilidade.update(aviso.id, { status: 'concluido' });
                }
                if (avisosPendentes.length > 0) {
                    console.log(`${avisosPendentes.length} usuários notificados sobre a disponibilidade do livro "${aluguel.livro}".`);
                }
            }

            notificar(`Livro "${aluguel.livro}" devolvido com sucesso! Multa: R$ ${multa.toFixed(2)}.`);
            renderDevolver();
        });
    }

    // ================================================================
    // 7. SOLICITAÇÕES 
    // ================================================================
    async function renderSolicitacoes() {
        await aguardarBanco();

        const solicitacoesLivros = await db.solicitacoes.toArray();
        const clientes = await db.clientes.toArray();
        const mapaClientes = {};
        clientes.forEach(c => { mapaClientes[c.id] = { nome: c.nome, apelido: c.apelido }; });
        solicitacoesLivros.sort((a, b) => new Date(b.data) - new Date(a.data));

        const solicitacoesAluguel = await db.solicitacoes_aluguel
            .where('status').equals('pendente')
            .toArray();
        solicitacoesAluguel.sort((a, b) => new Date(b.data_solicitacao) - new Date(a.data_solicitacao));

        let html = `<div class="card"><h3>Solicitações de Livros (Sugestões)</h3>`;
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
                
                const acoes = s.status === 'pendente' 
                    ? `<button onclick="adicionarLivroPorSolicitacao(${s.id})" style="background:#3498db; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Adicionar ao Catálogo</button>
                    <button onclick="atenderSolicitacao(${s.id})" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Atender</button>`
                    : '—';
                
                html += `<tr>
                    <td>${nomeUsuario}</td>
                    <td style="cursor:pointer; color:var(--btn-primary); text-decoration:underline;" onclick="verDetalhesSolicitacao(${s.id})">${s.titulo}</td>
                    <td>${s.autor || '—'}</td>
                    <td>${data}</td>
                    <td class="${statusClass}">${statusTexto}</td>
                    <td>${acoes}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `</div>`;

        // ===== SEÇÃO DE SOLICITAÇÕES DE ALUGUEL/DEVOLUÇÃO =====
        html += `<div class="card"><h3>Solicitações de Aluguel/Devolução (Pendentes)</h3>`;
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
                // FALLBACK: usa cliente_nome se não encontrar no mapa
                const usuario = mapaClientes[sol.cliente_id] || { nome: sol.cliente_nome || 'Desconhecido', apelido: '' };
                const nomeUsuario = usuario.apelido || usuario.nome;
                const data = new Date(sol.data_solicitacao).toLocaleDateString('pt-BR') + ' ' + new Date(sol.data_solicitacao).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                const tipoLabel = sol.tipo === 'aluguel' ? 'Aluguel' : 'Devolução';
                const multaExibicao = sol.multa_calculada ? `R$ ${sol.multa_calculada.toFixed(2)}` : '—';

                html += `<tr>
                    <td>${nomeUsuario}</td>
                    <td>${tipoLabel}</td>
                    <td>${sol.livro}</td>
                    <td>${data}</td>
                    <td>${multaExibicao}</td>
                    <td>
                        <button onclick="aceitarSolicitacaoAluguel(${sol.id})" style="background:#27ae60; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Aceitar</button>
                        <button onclick="recusarSolicitacaoAluguel(${sol.id})" style="background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin-left:4px;">Recusar</button>
                    </td>
                </tr>`;
            }
            html += `</tbody></table>`;
        }
        html += `</div>`;

        contentArea.innerHTML = html;

        // ===== FUNÇÕES AUXILIARES =====
        window.adicionarLivroPorSolicitacao = async function(id) {
            const solicitacao = await db.solicitacoes.get(id);
            if (!solicitacao) return;

            sessionStorage.setItem('solicitacao_titulo', solicitacao.titulo || '');
            sessionStorage.setItem('solicitacao_autor', solicitacao.autor || '');
            sessionStorage.setItem('solicitacao_editora', solicitacao.editora || '');
            sessionStorage.setItem('solicitacao_comentario', solicitacao.comentario || '');
            sessionStorage.setItem('solicitacao_id', solicitacao.id);

            const link = document.querySelector('a[data-section="adicionar-livros"]');
            if (link) {
                link.click();
                setTimeout(() => {
                    preencherFormularioAdicionarLivro();
                }, 200);
            } else {
                notificar('Seção "Adicionar Livros" não encontrada.', 'erro');
            }
        };

        function preencherFormularioAdicionarLivro() {
            const titulo = sessionStorage.getItem('solicitacao_titulo');
            const autor = sessionStorage.getItem('solicitacao_autor');
            const editora = sessionStorage.getItem('solicitacao_editora');
            const comentario = sessionStorage.getItem('solicitacao_comentario');

            if (!titulo && !autor) return;

            const inputTitulo = document.getElementById('novo-titulo');
            const inputAutor = document.getElementById('novo-autor');
            const inputEditora = document.getElementById('novo-editora');
            const textareaSinopse = document.getElementById('novo-sinopse');

            if (inputTitulo) inputTitulo.value = titulo || '';
            if (inputAutor) inputAutor.value = autor || '';
            if (inputEditora) inputEditora.value = editora || '';
            if (textareaSinopse) {
                let sinopse = comentario ? `Solicitado por usuário: "${comentario}"` : '';
                textareaSinopse.value = sinopse;
            }

            notificar('Dados da solicitação carregados! Você pode editá-los antes de adicionar.');
        }
    }

    // ===== FUNÇÕES PARA SOLICITAÇÕES DE LIVROS =====
    window.verDetalhesSolicitacao = async function(id) {
        const solicitacao = await db.solicitacoes.get(id);
        if (!solicitacao) return;
        const clientes = await db.clientes.toArray();
        const usuario = clientes.find(c => c.id === solicitacao.usuario_id) || {};
        const nomeUsuario = usuario.apelido || usuario.nome || 'Desconhecido';
        const fotoUrl = usuario.foto || 'static/src/avatares/usuario.jpg';
        const data = new Date(solicitacao.data).toLocaleDateString('pt-BR');
        const status = solicitacao.status === 'atendido' ? 'Atendido' : 'Pendente';

        const existente = document.getElementById('modal-detalhes-solicitacao');
        if (existente) existente.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-detalhes-solicitacao';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
        modal.innerHTML = `
            <div style="background:var(--bg-card, #fff); color:var(--text-primary, #333); padding:24px; border-radius:8px; max-width:500px; width:90%; max-height:80vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="margin:0; color:var(--text-primary, #333);">Detalhes da Solicitação</h3>
                    <button onclick="this.closest('#modal-detalhes-solicitacao').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-secondary, #999);">&times;</button>
                </div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                    <img src="${fotoUrl}" alt="${nomeUsuario}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" onerror="this.src='static/src/avatares/usuario.jpg'">
                    <div><strong>${nomeUsuario}</strong><br><small>${data} • ${status}</small></div>
                </div>
                <div><strong>Título:</strong> ${solicitacao.titulo}</div>
                ${solicitacao.autor ? `<div><strong>Autor:</strong> ${solicitacao.autor}</div>` : ''}
                ${solicitacao.editora ? `<div><strong>Editora:</strong> ${solicitacao.editora}</div>` : ''}
                ${solicitacao.comentario ? `<div style="background:var(--hover-bg, #f8f9fa); padding:12px; border-radius:6px; margin-bottom:16px;"><strong>Comentário:</strong><p style="margin:8px 0 0; color:var(--text-secondary, #555); font-style:italic;">"${solicitacao.comentario}"</p></div>` : ''}
                ${solicitacao.resposta ? `<div style="background:#e8f5e9; padding:12px; border-radius:6px; margin-bottom:16px; border-left:4px solid #27ae60;"><strong>Resposta:</strong><p style="margin:8px 0 0; color:#2e7d32;">${solicitacao.resposta}</p></div>` : ''}
                <div style="margin-top:12px;">
                    <label for="resposta-admin" style="display:block; margin-bottom:4px; font-weight:600; color:var(--text-primary);">Responder ao usuário:</label>
                    <textarea id="resposta-admin" rows="3" style="width:100%; padding:8px; border:1px solid var(--border-color, #ddd); border-radius:4px; background:var(--input-bg, #fff); color:var(--text-primary, #333);">${solicitacao.resposta || ''}</textarea>
                    <button onclick="enviarResposta(${solicitacao.id})" style="margin-top:8px; background:#2196F3; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Enviar Resposta</button>
                </div>
                ${solicitacao.status === 'pendente' ? `<button onclick="atenderSolicitacao(${solicitacao.id}); document.getElementById('modal-detalhes-solicitacao').remove();" style="background:#27ae60; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin-top:12px;">Atender</button>` : ''}
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
        const solicitacao = await db.solicitacoes.get(id);
        if (solicitacao) {
            await criarNotificacao(
                solicitacao.usuario_id,
                `Resposta para sua solicitação de livro "${solicitacao.titulo}": ${resposta}`,
                'sistema'
            );
        }
        notificar('Resposta enviada!');
        document.getElementById('modal-detalhes-solicitacao').remove();
        renderSolicitacoes();
    };

    // ================================================================
    // FUNÇÕES PARA SOLICITAÇÕES DE ALUGUEL/DEVOLUÇÃO
    // ================================================================
    window.aceitarSolicitacaoAluguel = async function(id) {
        try {
            await aguardarBanco();
            const solicitacao = await db.solicitacoes_aluguel.get(id);
            if (!solicitacao || solicitacao.status !== 'pendente') {
                notificar('Solicitação não encontrada ou já processada.', 'erro');
                return;
            }

            if (solicitacao.tipo === 'aluguel') {
                const livroAlugado = await db.alugueis.where('livro').equals(solicitacao.livro).filter(a => a.status === 'ativo').first();
                if (livroAlugado) {
                    notificar('Este livro já foi alugado por outro usuário.', 'erro');
                    return;
                }

                await db.alugueis.add({
                    cliente_id: solicitacao.cliente_id,
                    livro: solicitacao.livro,
                    data_locacao: solicitacao.data_locacao,
                    data_devolucao_prevista: solicitacao.data_devolucao_prevista,
                    status: 'ativo'
                });

                await registrarLog(
                    'aluguel',
                    solicitacao.cliente_id,
                    solicitacao.cliente_nome,
                    solicitacao.livro,
                    sessionStorage.getItem('usuario') || 'Bibliotecário'
                );

                await criarNotificacao(
                    solicitacao.cliente_id,
                    `Seu aluguel do livro "${solicitacao.livro}" foi aceito! Aproveite a leitura.`,
                    'aluguel'
                );
            } else if (solicitacao.tipo === 'devolucao') {
                const aluguel = await db.alugueis.where('cliente_id').equals(solicitacao.cliente_id)
                    .and(a => a.livro === solicitacao.livro && a.status === 'ativo')
                    .first();

                if (!aluguel) {
                    notificar('Aluguel ativo não encontrado para este livro.', 'erro');
                    return;
                }

                const hoje = new Date().toISOString().split('T')[0];
                await db.alugueis.update(aluguel.id, {
                    status: 'devolvido',
                    data_devolucao_real: hoje,
                    dias_atraso: solicitacao.multa_calculada ? Math.ceil(solicitacao.multa_calculada / MULTA_POR_DIA) : 0,
                    multa: solicitacao.multa_calculada || 0
                });

                await registrarLog(
                    'devolucao',
                    solicitacao.cliente_id,
                    solicitacao.cliente_nome,
                    solicitacao.livro,
                    sessionStorage.getItem('usuario') || 'Bibliotecário'
                );

                const livro = await db.livros.where('titulo').equals(solicitacao.livro).first();
                if (livro) {
                    const avisosPendentes = await db.avisos_disponibilidade
                        .where('livro_id').equals(livro.id)
                        .and(a => a.status === 'pendente')
                        .toArray();
                    for (const aviso of avisosPendentes) {
                        await criarNotificacao(
                            aviso.usuario_id,
                            `O livro "${solicitacao.livro}" que você aguardava está disponível!`,
                            'disponibilidade'
                        );
                        await db.avisos_disponibilidade.update(aviso.id, { status: 'concluido' });
                    }
                }

                await criarNotificacao(
                    solicitacao.cliente_id,
                    `Sua devolução do livro "${solicitacao.livro}" foi confirmada. Obrigado!`,
                    'devolucao'
                );
            }

            await db.solicitacoes_aluguel.update(id, {
                status: 'aceita',
                bibliotecario: sessionStorage.getItem('usuario') || 'Bibliotecário',
                resposta: 'Solicitação aceita.'
            });

            notificar('Solicitação aceita com sucesso!');
            renderSolicitacoes();

        } catch (err) {
            console.error('Erro ao aceitar solicitação:', err);
            notificar('Erro ao processar solicitação.', 'erro');
        }
    };

    window.recusarSolicitacaoAluguel = async function(id) {
        try {
            await aguardarBanco();
            const solicitacao = await db.solicitacoes_aluguel.get(id);
            if (!solicitacao || solicitacao.status !== 'pendente') {
                notificar('Solicitação não encontrada ou já processada.', 'erro');
                return;
            }

            await db.solicitacoes_aluguel.update(id, {
                status: 'recusada',
                bibliotecario: sessionStorage.getItem('usuario') || 'Bibliotecário',
                resposta: 'Solicitação recusada pelo bibliotecário.'
            });

            await registrarLog(
                'solicitacao_recusada',
                solicitacao.cliente_id,
                solicitacao.cliente_nome,
                solicitacao.livro,
                sessionStorage.getItem('usuario') || 'Bibliotecário'
            );

            await criarNotificacao(
                solicitacao.cliente_id,
                `Sua solicitação de ${solicitacao.tipo === 'aluguel' ? 'aluguel' : 'devolução'} do livro "${solicitacao.livro}" foi recusada.`,
                'sistema'
            );

            notificar('Solicitação recusada.');
            renderSolicitacoes();

        } catch (err) {
            console.error('Erro ao recusar solicitação:', err);
            notificar('Erro ao recusar solicitação.', 'erro');
        }
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