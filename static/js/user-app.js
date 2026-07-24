// ============================================================
// user-app.js – Painel do usuário (com aluguel integrado à biblioteca)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('👤 User app iniciado.');

    // ----------------------------------------------------------
    // CONSTANTES & CONFIGURAÇÕES
    // ----------------------------------------------------------
    const MULTA_POR_DIA = 1.00;

    // ----------------------------------------------------------
    // VERIFICAÇÃO DE LOGIN
    // ----------------------------------------------------------
    if (sessionStorage.getItem('perfil') !== 'usuario') {
        window.location.href = 'index.html';
        return;
    }

    // ----------------------------------------------------------
    // ELEMENTOS DOM PRINCIPAIS
    // ----------------------------------------------------------
    const contentUser  = document.getElementById('content-user');
    const sectionTitle = document.getElementById('section-title-user');
    const userNome     = document.getElementById('user-nome');
    const userApelido  = document.getElementById('user-apelido');
    const userAvatar   = document.getElementById('user-avatar');
    const logoutBtn    = document.getElementById('logout-user');

    const usuarioId    = parseInt(sessionStorage.getItem('usuarioId'));
    let usuarioAtual   = null;

    // ----------------------------------------------------------
    // CARREGAMENTO INICIAL DO USUÁRIO
    // ----------------------------------------------------------
    async function carregarUsuario() {
        try {
            await aguardarBanco();
            usuarioAtual = await db.clientes.get(usuarioId);
            if (!usuarioAtual) {
                alert('Usuário não encontrado.');
                logout();
                return;
            }
            userNome.textContent    = usuarioAtual.nome.split(' ')[0] || usuarioAtual.nome;
            userApelido.textContent = usuarioAtual.apelido || '';
            userAvatar.src          = usuarioAtual.foto || 'static/src/avatares/usuario.jpg';
            console.log('✅ Usuário carregado:', usuarioAtual.nome);
        } catch (err) {
            console.error('Erro ao carregar usuário:', err);
            notificar('Erro ao carregar dados do usuário.', 'erro');
        }
    }

    // ================================================================
    // FUNÇÃO PARA CRIAR NOTIFICAÇÃO (para o próprio usuário)
    // ================================================================
    async function criarNotificacao(mensagem, tipo = 'sistema') {
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
    // FUNÇÃO PARA BUSCAR NOTIFICAÇÕES NÃO LIDAS
    // ================================================================
    async function buscarNotificacoesNaoLidas() {
        try {
            await aguardarBanco();
            return await db.notificacoes
                .where('usuario_id').equals(usuarioId)
                .and(n => n.lida === false)
                .toArray();
        } catch (err) {
            console.error('Erro ao buscar notificações:', err);
            return [];
        }
    }

    async function buscarTodasNotificacoes() {
        try {
            await aguardarBanco();
            return await db.notificacoes
                .where('usuario_id').equals(usuarioId)
                .reverse()
                .sortBy('data_criacao');
        } catch (err) {
            console.error('Erro ao buscar notificações:', err);
            return [];
        }
    }

    // ================================================================
    // FUNÇÃO PARA ATUALIZAR O CONTADOR DE NOTIFICAÇÕES
    // ================================================================
    async function atualizarContadorNotificacoes() {
        const notificacoes = await buscarNotificacoesNaoLidas();
        const badge = document.getElementById('badge-notificacoes');
        if (badge) {
            const count = notificacoes.length;
            badge.textContent = count > 0 ? count : '';
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }

    // ================================================================
    // FUNÇÃO AUXILIAR PARA GERAR CARD DE LIVRO
    // ================================================================
    function gerarCardLivro(livro, disponivel) {
        const statusClass = disponivel ? 'status-disponivel' : 'status-alugado';
        const statusTexto = disponivel ? 'Disponível' : 'Alugado';
        const capa = livro.capa || `static/src/${encodeURIComponent(livro.titulo)}.jpg`;
        return `
        <div class="livro-card" data-titulo="${livro.titulo}" style="cursor:pointer;">
            <div class="capa">
                <img src="${capa}" alt="${livro.titulo}" onerror="this.style.display='none'; this.parentElement.querySelector('.placeholder').style.display='flex';">
                <div class="placeholder" style="display:none;">📚</div>
            </div>
            <div class="info">
                <h4>${livro.titulo}</h4>
                <span class="status ${statusClass}">${statusTexto}</span>
            </div>
        </div>`;
    }

    // ================================================================
    // FUNÇÃO RENDERIZAR ABA (página inicial)
    // ================================================================
    async function renderizarAba(tipo) {
        const container = document.getElementById('grade-destaques');
        if (!container) return;
        let html = '';

        if (tipo === 'top_usuarios') {
            const clientes = await db.clientes.toArray();
            const top = clientes
                .filter(c => c.livros_lidos > 0)
                .sort((a, b) => (b.livros_lidos || 0) - (a.livros_lidos || 0))
                .slice(0, 5);

            if (top.length === 0) {
                html = '<p style="color: var(--text-secondary);">Nenhum usuário com livros lidos ainda.</p>';
            } else {
                html = '<div class="grade-livros">';
                top.forEach((u, i) => {
                    const pos = i + 1;
                    let bg, color;
                    if (pos === 1) { bg = '#FFD700'; color = '#000'; }
                    else if (pos === 2) { bg = '#C0C0C0'; color = '#000'; }
                    else if (pos === 3) { bg = '#CD7F32'; color = '#fff'; }
                    else { bg = '#E74C3C'; color = '#fff'; }

                    const foto = u.foto || 'static/src/avatares/usuario.jpg';
                    const apelido = u.apelido || u.nome;
                    html += `
                    <div class="livro-card" style="cursor:default; position:relative;">
                        <div class="capa" style="aspect-ratio:1/1; background:transparent; display:flex; align-items:center; justify-content:center; padding:10px; position:relative;">
                            <img src="${foto}" alt="${u.nome}" style="width:80%; height:80%; border-radius:50%; object-fit:cover; border:3px solid var(--accent-color);" onerror="this.src='static/src/avatares/usuario.jpg'">
                            <span style="position:absolute; top:10%; right:10%; background:${bg}; color:${color}; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.9rem; border:2px solid rgba(255,255,255,0.6); box-shadow:0 2px 8px rgba(0,0,0,0.3);">${pos}</span>
                        </div>
                        <div class="info" style="text-align:center;">
                            <h4>${apelido}</h4>
                            <span style="font-size:0.8rem; color: var(--text-secondary);">📚 ${u.livros_lidos} livros lidos</span>
                        </div>
                    </div>`;
                });
                html += '</div>';
            }
        } else {
            const livros = await db.livros.toArray();
            const ativos = await db.alugueis.where({ status: 'ativo' }).toArray();
            const alugadosSet = new Set(ativos.map(a => a.livro.split(' - ')[0].trim().toLowerCase()));

            let lista = [];
            if (tipo === 'top_livros') {
                lista = livros.sort(() => 0.5 - Math.random()).slice(0, 5);
            } else if (tipo === 'novos_livros') {
                lista = livros.sort((a, b) => b.id - a.id).slice(0, 5);
            } else {
                lista = livros.slice(0, 5);
            }

            html = '<div class="grade-livros">';
            lista.forEach(livro => {
                const tituloSimples = livro.titulo.split(' - ')[0].trim().toLowerCase();
                const disponivel = !alugadosSet.has(tituloSimples);
                html += gerarCardLivro(livro, disponivel);
            });
            html += '</div>';
        }

        container.innerHTML = html;

        container.querySelectorAll('.livro-card[data-titulo]').forEach(card => {
            card.addEventListener('click', () => abrirLivro(card.dataset.titulo));
        });
    }

    // ================================================================
    // ATUALIZAÇÃO AUTOMÁTICA
    // ================================================================
    let intervaloAtualizacao = null;
    let intervaloNotificacoes = null;

    function iniciarAtualizacaoAutomatica() {
        if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);
        intervaloAtualizacao = setInterval(async () => {
            const abaAtiva = document.querySelector('.btn-filtro[style*="accent-color"]');
            if (abaAtiva) {
                const tipo = abaAtiva.dataset.tipo;
                await renderizarAba(tipo);
                console.log('🔄 Aba atualizada automaticamente.');
            }
        }, 30000);

        if (intervaloNotificacoes) clearInterval(intervaloNotificacoes);
        intervaloNotificacoes = setInterval(async () => {
            await atualizarContadorNotificacoes();
            const sectionAtiva = document.querySelector('.menu-user a.active');
            if (sectionAtiva && sectionAtiva.dataset.section === 'notificacoes') {
                renderNotificacoes();
            }
        }, 15000);
    }

    function pararAtualizacaoAutomatica() {
        if (intervaloAtualizacao) {
            clearInterval(intervaloAtualizacao);
            intervaloAtualizacao = null;
        }
        if (intervaloNotificacoes) {
            clearInterval(intervaloNotificacoes);
            intervaloNotificacoes = null;
        }
    }

    // ================================================================
    // SEÇÃO: PÁGINA INICIAL
    // ================================================================
    async function renderInicio() {
        try {
            await aguardarBanco();
            console.log('📌 Renderizando página inicial...');

            let html = `
            <div class="card-user">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
                    <h3 style="margin:0;">📌 Destaques</h3>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn-filtro" data-tipo="top_livros"    style="background:var(--accent-color); color:#fff; border:none; padding:6px 16px; border-radius:20px; font-size:0.8rem; cursor:pointer;">Top Livros</button>
                        <button class="btn-filtro" data-tipo="novos_livros"  style="background:var(--bg-sidebar); color:var(--text-secondary); border:1px solid var(--border-color); padding:6px 16px; border-radius:20px; font-size:0.8rem; cursor:pointer;">Novos Livros</button>
                        <button class="btn-filtro" data-tipo="top_usuarios"   style="background:var(--bg-sidebar); color:var(--text-secondary); border:1px solid var(--border-color); padding:6px 16px; border-radius:20px; font-size:0.8rem; cursor:pointer;">Top Usuários</button>
                    </div>
                </div>
                <div id="grade-destaques"></div>
            </div>`;

            // Comunidade (avaliações)
            const avaliacoes = await db.avaliacoes.toArray();
            const clientes = await db.clientes.toArray();
            const mapaClientes = {};
            clientes.forEach(c => {
                mapaClientes[c.id] = {
                    nome: c.nome,
                    apelido: c.apelido || c.nome,
                    foto: c.foto || ''
                };
            });
            avaliacoes.sort((a, b) => new Date(b.data) - new Date(a.data));

            html += '<div class="card-user"><h3>💬 Comunidade - Avaliações</h3>';
            if (avaliacoes.length === 0) {
                html += '<p>Ainda não há avaliações. Seja o primeiro!</p>';
            } else {
                html += '<div style="display:grid; gap:16px;">';
                avaliacoes.forEach(av => {
                    const user = mapaClientes[av.usuario_id] || { nome: 'Anônimo', apelido: 'Anônimo', foto: '' };
                    const fotoUrl = user.foto || 'static/src/avatares/usuario.jpg';
                    const nomeExibicao = user.apelido || user.nome;
                    html += `
                    <div style="background: var(--bg-sidebar); padding: 16px; border-radius: 8px; border-left: 4px solid var(--accent-color); display: flex; align-items: center; gap: 16px;">
                        <div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 2px solid var(--accent-color);">
                            <img src="${fotoUrl}" alt="${nomeExibicao}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='static/src/avatares/usuario.jpg'">
                        </div>
                        <div style="flex:1;">
                            <p><strong>${av.livro}</strong> - ⭐ ${av.nota}/5</p>
                            <p style="color: var(--text-secondary);">${av.comentario || 'Sem comentário'}</p>
                            <small style="color: var(--text-secondary);">Por <strong>${nomeExibicao}</strong> em ${av.data}</small>
                        </div>
                    </div>`;
                });
                html += '</div>';
            }

            // Formulário de avaliação
            html += `
            <hr style="border-color: var(--border-color); margin: 24px 0;">
            <h4>Deixe sua avaliação</h4>
            <form id="form-avaliacao-inicio" class="form-user" style="max-width:100%;">
                <div><label for="avaliacao-livro-inicio">Livro</label><input type="text" id="avaliacao-livro-inicio" placeholder="Título do livro" required></div>
                <div><label for="avaliacao-nota-inicio">Nota (1-5)</label><input type="number" id="avaliacao-nota-inicio" min="1" max="5" placeholder="5" required></div>
                <div class="full-width"><label for="avaliacao-comentario-inicio">Comentário</label><textarea id="avaliacao-comentario-inicio" rows="3" placeholder="Sua opinião..."></textarea></div>
                <div class="full-width"><button type="submit" class="btn-user">Enviar avaliação</button></div>
            </form>`;
            html += '</div>';

            contentUser.innerHTML = html;

            // Configura as abas
            const botoesFiltro = document.querySelectorAll('.btn-filtro');
            async function setAba(tipo) {
                botoesFiltro.forEach(btn => {
                    const isActive = btn.dataset.tipo === tipo;
                    btn.style.background = isActive ? 'var(--accent-color)' : 'var(--bg-sidebar)';
                    btn.style.color      = isActive ? '#fff' : 'var(--text-secondary)';
                    btn.style.border     = isActive ? 'none' : '1px solid var(--border-color)';
                });
                await renderizarAba(tipo);
            }
            botoesFiltro.forEach(btn => btn.addEventListener('click', () => setAba(btn.dataset.tipo)));
            await setAba('top_livros');

            iniciarAtualizacaoAutomatica();

            document.getElementById('form-avaliacao-inicio').addEventListener('submit', async (e) => {
                e.preventDefault();
                const livro = document.getElementById('avaliacao-livro-inicio').value.trim();
                const nota = parseInt(document.getElementById('avaliacao-nota-inicio').value);
                const comentario = document.getElementById('avaliacao-comentario-inicio').value.trim();
                if (!livro || !nota || nota < 1 || nota > 5) {
                    notificar('Preencha todos os campos corretamente.', 'erro');
                    return;
                }
                await db.avaliacoes.add({
                    livro,
                    usuario_id: usuarioId,
                    nota,
                    comentario,
                    data: new Date().toISOString().split('T')[0]
                });
                notificar('Avaliação enviada com sucesso!');
                renderInicio();
            });

            console.log('✅ Página inicial renderizada.');
        } catch (err) {
            console.error('Erro ao renderizar início:', err);
            contentUser.innerHTML = '<p>⚠️ Erro ao carregar a página inicial.</p>';
        }
    }

    // ================================================================
    // SEÇÃO: BIBLIOTECA (COM PESQUISA E ALUGUEL INTEGRADO)
    // ================================================================
    async function renderBiblioteca() {
        try {
            await aguardarBanco();
            const livros = await db.livros.toArray();
            const ativos = await db.alugueis.where({ status: 'ativo' }).toArray();
            const alugadosSet = new Set(ativos.map(a => a.livro.split(' - ')[0].trim().toLowerCase()));

            // Ordena por título
            livros.sort((a, b) => a.titulo.localeCompare(b.titulo));

            let html = `
                <div class="card-user">
                    <h3>📚 Todos os Livros</h3>
                    <div style="display:flex; gap:8px; margin-bottom:16px;">
                        <input type="text" id="pesquisa-biblioteca" placeholder="🔍 Pesquisar livro..." style="flex:1; padding:10px 14px; border:1px solid var(--border-color); border-radius:6px; font-size:0.95rem; background:var(--bg-card); color:var(--text-primary);">
                        <button id="btn-limpar-pesquisa-biblioteca" style="padding:8px 16px; background:#e74c3c; color:#fff; border:none; border-radius:6px; cursor:pointer;">✕</button>
                    </div>
                    <div id="grade-biblioteca" class="grade-livros">
                        <!-- Os livros serão renderizados aqui -->
                    </div>
                </div>
            `;

            contentUser.innerHTML = html;

            // Função para renderizar os cards com filtro
            function renderizarLivros(lista) {
                const container = document.getElementById('grade-biblioteca');
                if (!container) return;
                if (lista.length === 0) {
                    container.innerHTML = '<p style="color: var(--text-secondary); text-align:center; padding:20px;">Nenhum livro encontrado.</p>';
                    return;
                }
                let cards = '';
                lista.forEach(livro => {
                    const tituloSimples = livro.titulo.split(' - ')[0].trim().toLowerCase();
                    const disponivel = !alugadosSet.has(tituloSimples);
                    cards += gerarCardLivro(livro, disponivel);
                });
                container.innerHTML = cards;

                // Adiciona listener para abrir detalhes
                container.querySelectorAll('.livro-card[data-titulo]').forEach(card => {
                    card.addEventListener('click', () => abrirLivro(card.dataset.titulo));
                });
            }

            // Renderiza todos
            renderizarLivros(livros);

            // Lógica de pesquisa
            const inputPesquisa = document.getElementById('pesquisa-biblioteca');
            const btnLimpar = document.getElementById('btn-limpar-pesquisa-biblioteca');

            inputPesquisa.addEventListener('input', function() {
                const termo = this.value.trim().toLowerCase();
                if (termo === '') {
                    renderizarLivros(livros);
                    return;
                }
                const filtrados = livros.filter(l => 
                    l.titulo.toLowerCase().includes(termo) ||
                    l.autor.toLowerCase().includes(termo) ||
                    (l.genero && l.genero.toLowerCase().includes(termo))
                );
                renderizarLivros(filtrados);
            });

            btnLimpar.addEventListener('click', () => {
                inputPesquisa.value = '';
                renderizarLivros(livros);
                inputPesquisa.focus();
            });

        } catch (err) {
            console.error('Erro ao renderizar biblioteca:', err);
            contentUser.innerHTML = '<p>⚠️ Erro ao carregar a biblioteca.</p>';
        }
    }

    // ================================================================
    // SEÇÃO: MEUS LIVROS
    // ================================================================
    async function renderMeusLivros() {
        try {
            await aguardarBanco();
            const alugueis = await db.alugueis.where({ cliente_id: usuarioId }).toArray();
            if (alugueis.length === 0) {
                contentUser.innerHTML = `<div class="card-user"><h3>📖 Meus Livros</h3><p>Você ainda não alugou nenhum livro.</p></div>`;
                return;
            }

            let html = `<div class="card-user"><h3>📖 Meus Livros</h3>
                <table class="tabela-user">
                    <thead><tr>
                        <th>Livro</th><th>Data Locação</th><th>Prev. Devolução</th><th>Devolução Real</th>
                        <th>Status</th><th>Atraso</th><th>Multa</th><th>Ação</th>
                    </tr></thead><tbody>`;

            alugueis.forEach(aluguel => {
                const status      = aluguel.status === 'ativo' ? 'Ativo' : 'Devolvido';
                const statusClass = aluguel.status === 'ativo' ? 'status-disponivel' : 'status-alugado';
                const dataLoc     = aluguel.data_locacao.split('-').reverse().join('/');
                const dataPrev    = parseData(aluguel.data_devolucao_prevista);
                const devPrev     = dataPrev ? dataPrev.toLocaleDateString('pt-BR') : '-';
                const dataReal    = parseData(aluguel.data_devolucao_real);
                const devReal     = dataReal ? dataReal.toLocaleDateString('pt-BR') : '-';

                let diasAtraso = aluguel.dias_atraso;
                let multa      = aluguel.multa;
                if ((diasAtraso === undefined || diasAtraso === null) &&
                    aluguel.status === 'devolvido' && dataPrev && dataReal && dataReal > dataPrev) {
                    const diffMs = dataReal - dataPrev;
                    diasAtraso = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    multa = diasAtraso * MULTA_POR_DIA;
                } else {
                    diasAtraso = diasAtraso || 0;
                    multa = multa || 0;
                }

                const atrasoStr = diasAtraso > 0 ? `${diasAtraso} dia(s)` : '—';
                const multaStr  = multa > 0 ? `R$ ${multa.toFixed(2)}` : '—';

                html += `<tr data-id="${aluguel.id}">
                    <td>${aluguel.livro}</td><td>${dataLoc}</td><td>${devPrev}</td><td>${devReal}</td>
                    <td class="${statusClass}">${status}</td><td>${atrasoStr}</td><td>${multaStr}</td>
                    <td class="acoes-cell"></td>
                </tr>`;
            });

            html += '</tbody></table></div>';
            contentUser.innerHTML = html;

            // Botões de ação (renovar e devolver - que agora viram solicitações)
            document.querySelectorAll('tr[data-id]').forEach(row => {
                const aluguelId = parseInt(row.dataset.id);
                const acoesCell = row.querySelector('.acoes-cell');
                if (acoesCell) {
                    const aluguel = alugueis.find(a => a.id === aluguelId);
                    if (aluguel && aluguel.status === 'ativo') {
                        // Renovar continua direto (sem aprovação)
                        const btnRenovar = document.createElement('button');
                        btnRenovar.className = 'btn-user';
                        btnRenovar.textContent = '🔄 Renovar';
                        btnRenovar.style.padding = '4px 12px';
                        btnRenovar.style.fontSize = '0.8rem';
                        btnRenovar.addEventListener('click', () => renovarAluguel(aluguelId));

                        // Devolver agora vira solicitação
                        const btnDevolver = document.createElement('button');
                        btnDevolver.className = 'btn-user';
                        btnDevolver.textContent = '📦 Solicitar Devolução';
                        btnDevolver.style.padding = '4px 12px';
                        btnDevolver.style.fontSize = '0.8rem';
                        btnDevolver.style.background = '#f39c12';
                        btnDevolver.style.marginLeft = '4px';
                        btnDevolver.addEventListener('click', () => solicitarDevolucao(aluguelId));

                        acoesCell.appendChild(btnRenovar);
                        acoesCell.appendChild(btnDevolver);
                    } else {
                        acoesCell.textContent = '-';
                    }
                }
            });

        } catch (err) {
            console.error('Erro ao renderizar meus livros:', err);
            contentUser.innerHTML = '<p>⚠️ Erro ao carregar seus livros.</p>';
        }
    }

    // ================================================================
    // FUNÇÃO PARA SOLICITAR DEVOLUÇÃO
    // ================================================================
    window.solicitarDevolucao = async function(aluguelId) {
        try {
            await aguardarBanco();
            const aluguel = await db.alugueis.get(aluguelId);
            if (!aluguel || aluguel.status !== 'ativo') {
                notificar('Este aluguel não está ativo.', 'erro');
                return;
            }

            // Verifica se já existe uma solicitação pendente para este aluguel
            const solicitacaoExistente = await db.solicitacoes_aluguel
                .where('cliente_id').equals(usuarioId)
                .and(s => s.livro === aluguel.livro && s.tipo === 'devolucao' && s.status === 'pendente')
                .first();

            if (solicitacaoExistente) {
                notificar('Você já tem uma solicitação de devolução pendente para este livro.', 'erro');
                return;
            }

            // Calcula multa (se houver)
            const hoje = new Date().toISOString().split('T')[0];
            let diasAtraso = 0, multa = 0;
            const dataPrevista = parseData(aluguel.data_devolucao_prevista);
            const dataReal = new Date(hoje + 'T00:00:00');
            if (dataPrevista && dataReal > dataPrevista) {
                const diffMs = dataReal - dataPrevista;
                diasAtraso = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                multa = diasAtraso * MULTA_POR_DIA;
            }

            // Mostra mensagem com multa (se houver)
            let confirmar = true;
            if (multa > 0) {
                confirmar = confirm(`⚠️ Atenção! Esta devolução está com ${diasAtraso} dia(s) de atraso. Multa de R$ ${multa.toFixed(2)}. Deseja continuar?`);
            } else {
                confirmar = confirm('Confirma a solicitação de devolução do livro "' + aluguel.livro + '"?');
            }

            if (!confirmar) {
                notificar('Solicitação cancelada.', 'aviso');
                return;
            }

            // Cria a solicitação
            await db.solicitacoes_aluguel.add({
                tipo: 'devolucao',
                cliente_id: usuarioId,
                cliente_nome: usuarioAtual.nome,
                livro: aluguel.livro,
                data_solicitacao: new Date().toISOString(),
                data_locacao: aluguel.data_locacao,
                data_devolucao_prevista: aluguel.data_devolucao_prevista,
                status: 'pendente',
                multa_calculada: multa,
                bibliotecario: null,
                resposta: null
            });

            // Cria notificação para o próprio usuário (informando que foi enviado)
            await criarNotificacao(
                `📤 Você solicitou a devolução do livro "${aluguel.livro}". Aguarde a confirmação do bibliotecário.`,
                'devolucao'
            );

            notificar('Solicitação de devolução enviada com sucesso! Acompanhe em Notificações.');
            renderMeusLivros();

        } catch (err) {
            console.error('Erro ao solicitar devolução:', err);
            notificar('Erro ao enviar solicitação.', 'erro');
        }
    };

    // ================================================================
    // SEÇÃO: PERFIL (visualização)
    // ================================================================
    async function renderPerfil() {
        try {
            await aguardarBanco();
            if (!usuarioAtual) await carregarUsuario();

            const avaliacoes = await db.avaliacoes.where('usuario_id').equals(usuarioId).toArray();
            avaliacoes.sort((a, b) => new Date(b.data) - new Date(a.data));

            const fotoUrl    = usuarioAtual.foto || 'static/src/avatares/usuario.jpg';
            const bio        = usuarioAtual.bio || 'Nenhuma bio cadastrada.';
            const nascimento = usuarioAtual.nascimento
                ? new Date(usuarioAtual.nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                : 'Não informado';
            const lendoAgora = usuarioAtual.lendo_agora || 'Nenhum livro no momento.';
            const apelido    = usuarioAtual.apelido || '';

            let html = `
            <div class="card-user" style="text-align:center;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <img src="${fotoUrl}" alt="${usuarioAtual.nome}" style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:4px solid var(--accent-color); margin-bottom:12px;" onerror="this.src='static/src/avatares/usuario.jpg'">
                    <h2 style="margin:0; font-size:2rem;">${apelido || usuarioAtual.nome}</h2>
                    <p style="color:var(--text-secondary); font-size:1rem; margin-top:4px;">${usuarioAtual.nome}</p>
                </div>
            </div>
            <div class="card-user">
                <h3>🧾 Sobre</h3>
                <p><strong>Bio:</strong> ${bio}</p>
                <p><strong>Nascimento:</strong> ${nascimento}</p>
                <p><strong>Lendo agora:</strong> ${lendoAgora}</p>
            </div>`;

            html += '<div class="card-user"><h3>⭐ Minhas Avaliações</h3>';
            if (avaliacoes.length === 0) {
                html += '<p>Você ainda não fez nenhuma avaliação.</p>';
            } else {
                avaliacoes.forEach(av => {
                    html += `
                    <div style="background:var(--bg-sidebar); padding:12px 16px; border-radius:8px; margin-bottom:10px; border-left:3px solid var(--accent-color);">
                        <p><strong>${av.livro}</strong> - ★ ${av.nota}/5</p>
                        <p style="color:var(--text-secondary); font-size:0.9rem;">${av.comentario || 'Sem comentário'}</p>
                        <small style="color:var(--text-secondary);">${av.data}</small>
                    </div>`;
                });
            }
            html += '</div>';
            contentUser.innerHTML = html;
        } catch (err) {
            console.error('Erro ao renderizar perfil:', err);
            contentUser.innerHTML = '<p>⚠️ Erro ao carregar perfil.</p>';
        }
    }

    // ================================================================
    // SEÇÃO: EDITAR PERFIL
    // ================================================================
    async function renderEditarPerfil() {
        try {
            await aguardarBanco();
            if (!usuarioAtual) await carregarUsuario();

            const bio        = usuarioAtual.bio || '';
            const nascimento = usuarioAtual.nascimento || '';
            const lendoAgora = usuarioAtual.lendo_agora || '';
            const foto       = usuarioAtual.foto || '';

            let html = `
            <div class="card-user">
                <h3>✏️ Editar Perfil</h3>
                <h4 style="margin-top:20px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--accent-color);">PERFIL</h4>
                <div style="display:grid; grid-template-columns:1fr; gap:16px; margin-top:16px;">
                    <div>
                        <label>URL da foto (avatar) – opcional</label>
                        <input type="text" id="edit-foto" value="${foto}" style="width:100%; padding:10px 14px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-card); color:var(--text-primary);">
                    </div>
                    <div>
                        <label>Bio (descrição curta)</label>
                        <textarea id="edit-bio" rows="3" style="width:100%; padding:10px 14px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-card); color:var(--text-primary); resize:vertical;">${bio}</textarea>
                    </div>
                    <div>
                        <label>📖 Lendo agora</label>
                        <input type="text" id="edit-lendo" value="${lendoAgora}" style="width:100%; padding:10px 14px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-card); color:var(--text-primary);">
                    </div>
                    <div>
                        <label>Data de Nascimento</label>
                        <input type="date" id="edit-nascimento" value="${nascimento}" style="width:100%; padding:10px 14px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-card); color:var(--text-primary);">
                    </div>
                </div>
                <h4 style="margin-top:30px; border-bottom:1px solid var(--border-color); padding-bottom:8px; color:var(--accent-color);">USUÁRIO</h4>
                <div style="display:grid; grid-template-columns:1fr; gap:16px; margin-top:16px;">
                    <div>
                        <label>Nova senha</label>
                        <input type="password" id="edit-senha" placeholder="Deixe em branco para manter a atual" style="width:100%; padding:10px 14px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-card); color:var(--text-primary);">
                        <small style="color:var(--text-secondary);">Mínimo 4 caracteres</small>
                    </div>
                </div>
                <button type="button" id="btn-salvar-perfil" class="btn-user" style="margin-top:30px; width:100%;">💾 Salvar alterações</button>
            </div>`;
            contentUser.innerHTML = html;

            document.getElementById('btn-salvar-perfil').addEventListener('click', async (e) => {
                e.preventDefault();
                const fotoVal  = document.getElementById('edit-foto').value.trim();
                const bioVal   = document.getElementById('edit-bio').value.trim();
                const lendoVal = document.getElementById('edit-lendo').value.trim();
                const nascVal  = document.getElementById('edit-nascimento').value;
                const senhaVal = document.getElementById('edit-senha').value.trim();

                if (senhaVal !== '' && senhaVal.length < 4) {
                    notificar('A nova senha deve ter no mínimo 4 caracteres.', 'erro');
                    return;
                }
                if (fotoVal && typeof validarURLImagem === 'function' && !validarURLImagem(fotoVal)) {
                    notificar('URL da foto inválida. Use um link com extensão .jpg, .png, .gif ou .webp.', 'erro');
                    return;
                }

                const atualizacao = {};
                if (fotoVal)  atualizacao.foto        = fotoVal;
                if (bioVal)   atualizacao.bio         = bioVal;
                if (lendoVal) atualizacao.lendo_agora = lendoVal;
                if (nascVal)  atualizacao.nascimento  = nascVal;
                if (senhaVal && senhaVal.length >= 4) atualizacao.senha = senhaVal;

                if (Object.keys(atualizacao).length === 0) {
                    notificar('Nenhuma alteração foi feita.', 'erro');
                    return;
                }

                try {
                    await db.clientes.update(usuarioId, atualizacao);
                    if (fotoVal) userAvatar.src = fotoVal;
                    usuarioAtual = await db.clientes.get(usuarioId);
                    notificar('Perfil atualizado com sucesso!');
                    renderEditarPerfil();
                } catch (err) {
                    console.error('Erro ao salvar perfil:', err);
                    notificar('Erro ao salvar alterações.', 'erro');
                }
            });
        } catch (err) {
            console.error('Erro ao renderizar editar perfil:', err);
            contentUser.innerHTML = '<p>⚠️ Erro ao carregar edição de perfil.</p>';
        }
    }

    // ================================================================
    // SEÇÃO: SOLICITAR LIVROS (sugestões de novos títulos)
    // ================================================================
    async function renderSolicitarLivros() {
        try {
            await aguardarBanco();

            if (!db.solicitacoes) {
                contentUser.innerHTML = '<div class="card-user"><h3>📩 Solicitar Livros</h3><p>Recurso temporariamente indisponível.</p></div>';
                return;
            }

            const minhasSolicitacoes = await db.solicitacoes.where('usuario_id').equals(usuarioId).toArray();
            minhasSolicitacoes.sort((a, b) => new Date(b.data) - new Date(a.data));

            let html = `
                <div class="card-user">
                    <h3>📩 Solicitar Livros</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">Sugira novos títulos para nossa biblioteca.</p>
                    <form id="form-solicitar-livro" class="form-user" style="max-width: 100%;">
                        <div class="full-width">
                            <label for="solic-titulo">Título do livro *</label>
                            <input type="text" id="solic-titulo" placeholder="Ex: O Nome do Vento" required>
                        </div>
                        <div>
                            <label for="solic-autor">Autor</label>
                            <input type="text" id="solic-autor" placeholder="Ex: Patrick Rothfuss">
                        </div>
                        <div>
                            <label for="solic-editora">Editora (opcional)</label>
                            <input type="text" id="solic-editora" placeholder="Ex: Arqueiro">
                        </div>
                        <div class="full-width">
                            <label for="solic-comentario">Por que você recomenda?</label>
                            <textarea id="solic-comentario" rows="2" placeholder="Conte-nos um pouco sobre o livro..."></textarea>
                        </div>
                        <div class="full-width">
                            <button type="submit" class="btn-user">Enviar Solicitação</button>
                        </div>
                    </form>
                </div>
            `;

            html += `<div class="card-user"><h3>📋 Minhas Solicitações</h3>`;
            if (minhasSolicitacoes.length === 0) {
                html += `<p style="color: var(--text-secondary);">Você ainda não enviou nenhuma solicitação.</p>`;
            } else {
                html += `<div style="display: flex; flex-direction: column; gap: 12px;">`;
                minhasSolicitacoes.forEach(s => {
                    const statusTexto = s.status === 'atendido' ? '✅ Atendido' : '⏳ Pendente';
                    const statusCor = s.status === 'atendido' ? '#27ae60' : '#f39c12';
                    html += `
                    <div style="background: var(--bg-sidebar); padding: 12px 16px; border-radius: 8px; border-left: 3px solid ${statusCor};">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <strong style="color: var(--text-primary);">${s.titulo}</strong>
                            <span style="font-size: 0.8rem; color: ${statusCor}; font-weight: 600;">${statusTexto}</span>
                        </div>
                        ${s.autor ? `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Autor: ${s.autor}</p>` : ''}
                        ${s.comentario ? `<p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 4px;">"${s.comentario}"</p>` : ''}
                        ${s.resposta ? `
                            <div style="background: rgba(39, 174, 96, 0.1); padding: 8px 12px; border-radius: 4px; margin-top: 8px; border-left: 3px solid #27ae60;">
                                <strong style="color: #27ae60;">📬 Resposta da biblioteca:</strong>
                                <p style="margin: 4px 0 0; color: var(--text-secondary); font-size: 0.85rem;">${s.resposta}</p>
                            </div>
                        ` : ''}
                        <small style="color: var(--text-secondary); font-size: 0.75rem;">Enviado em ${new Date(s.data).toLocaleDateString('pt-BR')}</small>
                    </div>
                    `;
                });
                html += `</div>`;
            }
            html += `</div>`;

            contentUser.innerHTML = html;

            document.getElementById('form-solicitar-livro').addEventListener('submit', async (e) => {
                e.preventDefault();
                const titulo = document.getElementById('solic-titulo').value.trim();
                const autor = document.getElementById('solic-autor').value.trim();
                const editora = document.getElementById('solic-editora').value.trim();
                const comentario = document.getElementById('solic-comentario').value.trim();

                if (!titulo) {
                    notificar('Informe ao menos o título do livro.', 'erro');
                    return;
                }

                await db.solicitacoes.add({
                    usuario_id: usuarioId,
                    titulo,
                    autor,
                    editora,
                    comentario,
                    data: new Date().toISOString(),
                    status: 'pendente'
                });

                notificar('Solicitação enviada com sucesso!');
                renderSolicitarLivros();
            });
        } catch (err) {
            console.error('Erro ao renderizar solicitações:', err);
            contentUser.innerHTML = '<p>⚠️ Erro ao carregar a seção de solicitações.</p>';
        }
    }

    // ================================================================
    // SEÇÃO: NOTIFICAÇÕES
    // ================================================================
    async function renderNotificacoes() {
        try {
            await aguardarBanco();
            const notificacoes = await buscarTodasNotificacoes();

            let html = `<div class="card-user"><h3>📬 Minhas Notificações</h3>`;

            if (notificacoes.length === 0) {
                html += `<p style="color: var(--text-secondary);">Você não tem notificações.</p>`;
            } else {
                // Marca todas como lidas ao abrir
                for (const n of notificacoes) {
                    if (!n.lida) {
                        await db.notificacoes.update(n.id, { lida: true });
                    }
                }
                await atualizarContadorNotificacoes();

                html += `<div style="display: flex; flex-direction: column; gap: 12px;">`;
                notificacoes.forEach(n => {
                    const data = new Date(n.data_criacao);
                    const dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                    const corBorda = n.tipo === 'aluguel' ? '#2ecc71' : n.tipo === 'devolucao' ? '#3498db' : '#f39c12';
                    html += `
                    <div style="background: var(--bg-sidebar); padding: 14px 18px; border-radius: 8px; border-left: 4px solid ${corBorda};">
                        <p style="margin: 0; color: var(--text-primary);">${n.mensagem}</p>
                        <small style="color: var(--text-secondary);">${dataStr}</small>
                    </div>
                    `;
                });
                html += `</div>`;
            }
            html += `</div>`;

            contentUser.innerHTML = html;
        } catch (err) {
            console.error('Erro ao renderizar notificações:', err);
            contentUser.innerHTML = '<p>⚠️ Erro ao carregar notificações.</p>';
        }
    }

    // ================================================================
    // FUNÇÃO GLOBAL: ABRIR LIVRO (MODAL COM DETALHES + BOTÃO ALUGAR)
    // ================================================================
    window.abrirLivro = async (titulo) => {
        try {
            await aguardarBanco();
            const livro = await db.livros.where('titulo').equals(titulo).first();
            if (!livro) {
                notificar('Livro não encontrado.', 'erro');
                return;
            }

            // Verifica se está disponível
            const ativos = await db.alugueis.where({ status: 'ativo' }).toArray();
            const tituloSimples = livro.titulo.split(' - ')[0].trim().toLowerCase();
            const disponivel = !ativos.some(a => a.livro.split(' - ')[0].trim().toLowerCase() === tituloSimples);

            // Remove modal anterior se existir
            const existente = document.getElementById('modal-detalhes-livro');
            if (existente) existente.remove();

            const capaUrl = livro.capa || `static/src/${encodeURIComponent(livro.titulo)}.jpg`;

            const modal = document.createElement('div');
            modal.id = 'modal-detalhes-livro';
            modal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(6px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            `;

            modal.innerHTML = `
                <div style="
                    background: var(--bg-card, #16213e);
                    color: var(--text-primary, #fff);
                    border-radius: 16px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 28px 32px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
                    border: 1px solid var(--border-color, #2a2a3a);
                    position: relative;
                ">
                    <button onclick="this.closest('#modal-detalhes-livro').remove()" style="
                        position: absolute;
                        top: 12px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: var(--text-secondary, #b0b0b0);
                        transition: color 0.2s;
                    ">&times;</button>

                    <div style="display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start;">
                        <div style="flex: 0 0 160px; max-width: 160px;">
                            <img src="${capaUrl}" alt="${livro.titulo}" style="
                                width: 100%;
                                height: auto;
                                border-radius: 8px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                display: block;
                            " onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'text-align:center; padding:40px 0; color:var(--text-secondary);\\'>📚 Capa não disponível</div>'">
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <h2 style="margin: 0 0 8px 0; font-size: 1.6rem; color: var(--text-primary, #fff);">${livro.titulo}</h2>
                            <p style="margin: 0 0 4px 0; color: var(--text-secondary, #b0b0b0); font-size: 1rem;"><strong>Autor:</strong> ${livro.autor}</p>
                            <p style="margin: 0 0 4px 0; color: var(--text-secondary, #b0b0b0); font-size: 1rem;"><strong>Editora:</strong> ${livro.editora} (${livro.ano})</p>
                            <p style="margin: 0 0 4px 0; color: var(--text-secondary, #b0b0b0); font-size: 1rem;"><strong>Gênero:</strong> ${livro.genero || 'Não informado'}</p>
                            <p style="margin: 0 0 4px 0; color: var(--text-secondary, #b0b0b0); font-size: 1rem;"><strong>Classificação:</strong> ${livro.classificacao || 'Livre'}</p>
                            <p style="margin: 0 0 4px 0; color: var(--text-secondary, #b0b0b0); font-size: 1rem;"><strong>Status:</strong> <span style="color: ${disponivel ? '#2ecc71' : '#e74c3c'}; font-weight:600;">${disponivel ? 'Disponível' : 'Indisponível'}</span></p>
                            <hr style="border-color: var(--border-color, #2a2a3a); margin: 12px 0;">
                            <p style="margin: 0; color: var(--text-primary, #fff); font-size: 0.95rem; line-height: 1.6;">
                                <strong>Sinopse:</strong><br>${livro.sinopse || 'Sinopse não disponível.'}
                            </p>
                            ${disponivel ? `
                                <button id="btn-alugar-deste-livro" style="margin-top: 16px; background: #2ecc71; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.2s;">
                                    📚 Alugar este livro
                                </button>
                            ` : `
                                <p style="margin-top: 16px; color: #e74c3c; text-align:center;">Este livro não está disponível no momento.</p>
                            `}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Fecha o modal ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            // Adiciona animação fade (se não existir)
            if (!document.getElementById('style-modal-fade')) {
                const style = document.createElement('style');
                style.id = 'style-modal-fade';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }

            // Listener do botão "Alugar este livro"
            const btnAlugar = document.getElementById('btn-alugar-deste-livro');
            if (btnAlugar) {
                btnAlugar.addEventListener('click', () => {
                    modal.remove(); // fecha o modal de detalhes
                    abrirModalConfirmarAluguel(livro.titulo);
                });
            }

        } catch (err) {
            console.error('Erro ao abrir detalhes do livro:', err);
            notificar('Erro ao carregar detalhes do livro.', 'erro');
        }
    };

    // ================================================================
    // FUNÇÃO: ABRIR MODAL DE CONFIRMAÇÃO DE ALUGUEL
    // ================================================================
    window.abrirModalConfirmarAluguel = async function(livroTitulo) {
        try {
            // Verifica se o livro ainda está disponível (evita conflito)
            await aguardarBanco();
            const ativos = await db.alugueis.where({ status: 'ativo' }).toArray();
            const tituloSimples = livroTitulo.split(' - ')[0].trim().toLowerCase();
            const disponivel = !ativos.some(a => a.livro.split(' - ')[0].trim().toLowerCase() === tituloSimples);

            if (!disponivel) {
                notificar('Este livro não está mais disponível.', 'erro');
                return;
            }

            // Verifica se o usuário já tem um aluguel ativo
            const aluguelAtivo = await db.alugueis
                .where('cliente_id').equals(usuarioId)
                .filter(a => a.status === 'ativo')
                .first();

            if (aluguelAtivo) {
                notificar('Você já possui um livro alugado. Devolva-o antes de solicitar outro.', 'erro');
                return;
            }

            // Verifica se já existe uma solicitação pendente para este livro
            const solicitacaoExistente = await db.solicitacoes_aluguel
                .where('cliente_id').equals(usuarioId)
                .and(s => s.livro === livroTitulo && s.tipo === 'aluguel' && s.status === 'pendente')
                .first();

            if (solicitacaoExistente) {
                notificar('Você já tem uma solicitação de aluguel pendente para este livro.', 'erro');
                return;
            }

            // Datas
            const hoje = new Date();
            const hojeStr = hoje.toISOString().split('T')[0];
            const devolucaoPrevista = new Date(hoje);
            devolucaoPrevista.setDate(devolucaoPrevista.getDate() + 7);
            const devolucaoStr = devolucaoPrevista.toISOString().split('T')[0];

            // Remove modal anterior se existir
            const existente = document.getElementById('modal-confirmar-aluguel');
            if (existente) existente.remove();

            const modal = document.createElement('div');
            modal.id = 'modal-confirmar-aluguel';
            modal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(6px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            `;

            modal.innerHTML = `
                <div style="
                    background: var(--bg-card, #16213e);
                    color: var(--text-primary, #fff);
                    border-radius: 16px;
                    max-width: 480px;
                    width: 100%;
                    padding: 28px 32px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
                    border: 1px solid var(--border-color, #2a2a3a);
                    position: relative;
                ">
                    <button onclick="this.closest('#modal-confirmar-aluguel').remove()" style="
                        position: absolute;
                        top: 12px;
                        right: 16px;
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: var(--text-secondary, #b0b0b0);
                        transition: color 0.2s;
                    ">&times;</button>

                    <h3 style="margin: 0 0 8px 0;">📚 Confirmar Aluguel</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">Confirme os dados para solicitar o aluguel do livro:</p>

                    <div style="background: var(--bg-sidebar); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <p><strong>Livro:</strong> ${livroTitulo}</p>
                        <p><strong>Data de locação:</strong> ${new Date(hojeStr).toLocaleDateString('pt-BR')}</p>
                        <p><strong>Devolução prevista:</strong> ${new Date(devolucaoStr).toLocaleDateString('pt-BR')} (7 dias)</p>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button id="btn-cancelar-aluguel" style="flex:1; padding: 10px; background: #e74c3c; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Cancelar</button>
                        <button id="btn-confirmar-aluguel" style="flex:2; padding: 10px; background: #2ecc71; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Solicitar Aluguel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            // Botão cancelar
            document.getElementById('btn-cancelar-aluguel').addEventListener('click', () => {
                modal.remove();
            });

            // Botão confirmar
            document.getElementById('btn-confirmar-aluguel').addEventListener('click', async () => {
                try {
                    // Verifica novamente disponibilidade
                    const ativosNovos = await db.alugueis.where({ status: 'ativo' }).toArray();
                    const disp = !ativosNovos.some(a => a.livro.split(' - ')[0].trim().toLowerCase() === tituloSimples);
                    if (!disp) {
                        notificar('Este livro não está mais disponível.', 'erro');
                        modal.remove();
                        return;
                    }

                    // Cria a solicitação
                    await db.solicitacoes_aluguel.add({
                        tipo: 'aluguel',
                        cliente_id: usuarioId,
                        cliente_nome: usuarioAtual.nome,
                        livro: livroTitulo,
                        data_solicitacao: new Date().toISOString(),
                        data_locacao: hojeStr,
                        data_devolucao_prevista: devolucaoStr,
                        status: 'pendente',
                        multa_calculada: null,
                        bibliotecario: null,
                        resposta: null
                    });

                    // Notifica o usuário
                    await criarNotificacao(
                        `📤 Você solicitou o aluguel do livro "${livroTitulo}". Aguarde a confirmação do bibliotecário.`,
                        'aluguel'
                    );

                    notificar('Solicitação de aluguel enviada com sucesso! Acompanhe em Notificações.');
                    modal.remove();

                    // Recarrega a biblioteca para atualizar status
                    renderBiblioteca();

                } catch (err) {
                    console.error('Erro ao enviar solicitação:', err);
                    notificar('Erro ao enviar solicitação.', 'erro');
                }
            });

        } catch (err) {
            console.error('Erro ao abrir modal de confirmação:', err);
            notificar('Erro ao processar solicitação.', 'erro');
        }
    };

    // ================================================================
    // FUNÇÕES: RENOVAR (direto) e DEVOLVER (agora via solicitação)
    // ================================================================
    window.renovarAluguel = async (aluguelId) => {
        try {
            await aguardarBanco();
            const aluguel = await db.alugueis.get(aluguelId);
            if (!aluguel || aluguel.status !== 'ativo') {
                notificar('Este aluguel não está ativo.', 'erro');
                return;
            }

            const data = new Date(aluguel.data_devolucao_prevista + 'T00:00:00');
            if (isNaN(data)) {
                notificar('Erro ao processar data.', 'erro');
                return;
            }
            data.setDate(data.getDate() + 7);
            const novaDataISO = data.toISOString().split('T')[0];
            await db.alugueis.update(aluguelId, { data_devolucao_prevista: novaDataISO });
            notificar(`Aluguel renovado até ${data.toLocaleDateString('pt-BR')}.`);
            renderMeusLivros();
        } catch (err) {
            console.error('Erro ao renovar:', err);
            notificar('Erro ao renovar aluguel.', 'erro');
        }
    };

    // ================================================================
    // LOGOUT
    // ================================================================
    if (typeof logout === 'function') {
        logoutBtn.addEventListener('click', logout);
    } else {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'index.html';
        });
    }

    // ================================================================
    // NAVEGAÇÃO ENTRE SEÇÕES
    // ================================================================
    const menuLinks = document.querySelectorAll('.menu-user a[data-section]');
    const titlesMap = {
        'inicio':            'Página Inicial',
        'perfil':            'Perfil',
        'editar-perfil':     'Editar Perfil',
        'biblioteca':        'Biblioteca',
        'meus-livros':       'Meus Livros',
        'solicitar-livros':  'Solicitar Livros',
        'notificacoes':      'Notificações'
        // 'alugar-livro' removido
    };

    menuLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            pararAtualizacaoAutomatica();

            const section = this.getAttribute('data-section');
            sectionTitle.textContent = titlesMap[section] || section;

            menuLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            switch (section) {
                case 'inicio':            renderInicio(); break;
                case 'perfil':            renderPerfil(); break;
                case 'editar-perfil':     renderEditarPerfil(); break;
                case 'biblioteca':        renderBiblioteca(); break;
                case 'meus-livros':       renderMeusLivros(); break;
                case 'solicitar-livros':  renderSolicitarLivros(); break;
                case 'notificacoes':      renderNotificacoes(); break;
                default: contentUser.innerHTML = '<p>Seção em desenvolvimento.</p>';
            }
        });
    });

    // ================================================================
    // INICIALIZAÇÃO
    // ================================================================
    carregarUsuario().then(async () => {
        // Atualiza contador de notificações
        await atualizarContadorNotificacoes();
        const linkInicio = document.querySelector('a[data-section="inicio"]');
        if (linkInicio) linkInicio.click();
        else renderInicio();
    }).catch(err => {
        console.error('Erro na inicialização:', err);
        contentUser.innerHTML = '<p>⚠️ Erro ao iniciar o painel. Recarregue a página.</p>';
    });

}); // FIM DOMContentLoaded