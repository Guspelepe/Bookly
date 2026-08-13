// ==========================================
// db.js – Configuração do Dexie (global)
// ==========================================

window.db = new Dexie('BibliotecaDB');

// ===== VERSÃO 14 – adiciona debates e respostas =====
db.version(14).stores({
    clientes: '++id, cpf, nome, apelido, foto, livros_lidos, media_estrelas, lendo_agora, bio, nascimento',
    alugueis: '++id, cliente_id, status, livro, dias_atraso, multa',
    livros: '++id, titulo, genero, capa',
    solicitacoes: '++id, usuario_id, titulo, autor, editora, comentario, data, status, resposta',
    avaliacoes: '++id, livro, usuario_id, nota, comentario, data',
    frases: '++id, texto, autor',
    logs: '++id, tipo, cliente_id, cliente_nome, livro, data, bibliotecario',
    solicitacoes_aluguel: '++id, tipo, cliente_id, cliente_nome, livro, data_solicitacao, data_locacao, data_devolucao_prevista, status, bibliotecario, multa_calculada, resposta',
    notificacoes: '++id, usuario_id, mensagem, lida, data_criacao, tipo',
    avisos_disponibilidade: '++id, usuario_id, livro_id, status, data_criacao',
    posts: '++id, usuario_id, livro_id, texto, data_criacao',
    debates: '++id, livro_id, titulo, mensagem, usuario_id, data_criacao, likes',
    respostas: '++id, debate_id, mensagem, usuario_id, data_criacao, likes' 
});


// ==========================================
// 1. LISTA DE LIVROS (atualizada – apenas os que você enviou)
// ==========================================
const LIVROS_INICIAIS = [
    { titulo: "1984 - George Orwell", autor: "George Orwell", ano: 1949, editora: "Companhia das Letras", genero: "ficção distópica", classificacao: "14+", sinopse: "1984, escrito por George Orwell e publicado em 1949, é uma distopia sobre a Oceânia, um superestado totalitário liderado pelo 'Grande Irmão'." },
    { titulo: "A Bagaceira - José Américo de Almeida", autor: "José Américo de Almeida", ano: 1928, editora: "Record", genero: "Romance", classificacao: "16+", sinopse: "O romance A Bagaceira, de José Américo de Almeida, narra o drama de retirantes que fogem da seca do sertão e buscam abrigo em um engenho no brejo paraibano." },
    { titulo: "A Culpa é das Estrelas - John Green", autor: "John Green", ano: 2012, editora: "Intrínseca", genero: "romance, drama, ficção", classificacao: "14+", sinopse: "Hazel Grace, uma jovem com câncer terminal, conhece e se apaixona por Augustus Waters em um grupo de apoio." },
    { titulo: "A Dança da Morte - Stephen King", autor: "Stephen King", ano: 1978, editora: "Suma", genero: "ficção científica pós-apocalíptica, fantasia sombria", classificacao: "16+", sinopse: "Após um vírus acidentalmente liberado dizimar 99% da humanidade, os sobreviventes do apocalipse são divididos em facções e atraídos para uma épica batalha final entre o bem e o mal." },
    { titulo: "A Divina Comédia - Dante Alighieri", autor: "Dante Alighieri", ano: 1320, editora: "34", genero: "poesia épica, alegoria teológica", classificacao: "Livre", sinopse: "A obra máxima de Dante Alighieri relata a jornada épica do próprio autor, guiado pelo poeta Virgílio, através do Inferno, Purgatório e Paraíso" },
    { titulo: "A Garota no Trem - Paula Hawkins", autor: "Paula Hawkins", ano: 2015, editora: "Record", genero: "suspense psicológico", classificacao: "14+", sinopse: "Uma mulher alcoólatra e divorciada, que observa diariamente um casal pela janela do trem, envolve-se em uma investigação de assassinato após testemunhar uma cena chocante." },
    { titulo: "A Hora da Estrela - Clarice Lispector", autor: "Clarice Lispector", ano: 1977, editora: "Rocco", genero: "romance", classificacao: "12", sinopse: "A obra narra a trajetória trágica e solitária de Macabéa, uma jovem migrante nordestina miserável e ingênua que sobrevive na cidade do Rio de Janeiro." },
    { titulo: "A Menina que Roubava Livros - Markus Zusak", autor: "Markus Zusak", ano: 2005, editora: "Intrínseca", genero: "romance, ficção", classificacao: "12+", sinopse: "Narrada pela Morte, a história acompanha Liesel Meminger, uma garota que enfrenta os horrores da Alemanha nazista encontrando conforto nos livros." },
    { titulo: "A Metamorfose - Franz Kafka", autor: "Franz Kafka", ano: 1915, editora: "Companhia das Letras", genero: "novela", classificacao: "14+", sinopse: "A obra-prima de Franz Kafka narra a história de Gregor Samsa, um caixeiro-viajante que sustenta a família. Certo dia, ele acorda inexplicavelmente transformado em um inseto monstruoso." },
    { titulo: "A Moreninha - Joaquim Manuel de Macedo", autor: "Joaquim Manuel de Macedo", ano: 1844, editora: "Ática", genero: "romance", classificacao: "Livre", sinopse: "A Moreninha, de Joaquim Manuel de Macedo, é um clássico do Romantismo brasileiro. A trama acompanha o estudante de medicina Augusto, que é desafiado por seu amigo Filipe a conquistar uma jovem na Ilha de Paquetá" },
    { titulo: "A Náusea - Jean-Paul Sartre", autor: "Jean-Paul Sartre", ano: 1938, editora: "Nova Fronteira", genero: "romance, ficção filosófica", classificacao: "16+", sinopse: "A Náusea acompanha Antoine Roquentin, um historiador que, ao viver em uma pequena cidade francesa, é tomado por uma profunda crise existencial e passa a registrar em seu diário o horror e o absurdo de perceber a existência gratuita e sem sentido do mundo ao seu redor." },
    { titulo: "A Peste - Albert Camus", autor: "Albert Camus", ano: 1947, editora: "Record", genero: "romance, ficção filosófica", classificacao: "18+", sinopse: "A história retrata o isolamento e a resistência de uma comunidade na Argélia assolada por uma epidemia fatal." },
    { titulo: "A Revolução dos Bichos - George Orwell", autor: "George Orwell", ano: 1945, editora: "Companhia das Letras", genero: "sátira política, alegoria, fábula", classificacao: "10+", sinopse: "Animais de uma granja se rebelam contra a exploração humana, estabelecendo um governo igualitário, mas a revolução degenera quando os porcos tomam o poder, corrompem os ideais originais e instauram uma tirania ainda mais opressiva." },
    { titulo: "A Seleção - Kiera Cass", autor: "Kiera Cass", ano: 2012, editora: "Seguinte", genero: "ficção juvenil, romance", classificacao: "12+", sinopse: "Trinta e cinco garotas são selecionadas para competir pelo coração do príncipe Maxon e pelo trono de Illéa." },
    { titulo: "A Sombra do Vento - Carlos Ruiz Zafón", autor: "Carlos Ruiz Zafón", ano: 2001, editora: "Suma", genero: "romance, suspense, mistério", classificacao: "16+", sinopse: "Em Barcelona (1945), o jovem Daniel Sempere descobre um livro misterioso e embarca em uma perigosa jornada para desvendar a identidade do autor Julián Carax, cujas obras estão sendo sistematicamente destruídas." },
    { titulo: "Admirável Mundo Novo - Aldous Huxley", autor: "Aldous Huxley", ano: 1932, editora: "Globo", genero: "romance, ficção científica, distopia", classificacao: "14+", sinopse: "O Estado Mundial controla a vida dos cidadãos desde a concepção em laboratórios, eliminando a família, o amor e a individualidade em prol da estabilidade e do consumo." },
    { titulo: "Angústia - Graciliano Ramos", autor: "Graciliano Ramos", ano: 1936, editora: "Record", genero: "romance", classificacao: "15+", sinopse: "Angústia narra a história de Luís da Silva, um funcionário público em Maceió consumido pelo ciúme, pela solidão e pela pobreza." },
    { titulo: "Anjos e Demônios - Dan Brown", autor: "Dan Brown", ano: 2000, editora: "Arqueiro", genero: "romance, suspense, mistério", classificacao: "16+", sinopse: "O professor Robert Langdon corre contra o tempo em Roma para impedir que a antiga seita dos Illuminati destrua a Cidade do Vaticano com uma arma de antimatéria e assassine quatro cardeais." },
    { titulo: "Anna Kariênina - Liev Tolstói", autor: "Liev Tolstói", ano: 1877, editora: "Companhia das Letras", genero: "romance", classificacao: "14+", sinopse: "O clássico Anna Kariênina de Liev Tolstói acompanha uma aristocrata russa que abandona o casamento e enfrenta o cruel julgamento da alta sociedade ao viver um romance proibido com um oficial do exército." },
    { titulo: "Anne de Green Gables - Lucy Maud Montgomery", autor: "Lucy Maud Montgomery", ano: 1908, editora: "Principis", genero: "romance, ficção", classificacao: "11+", sinopse: "A órfã Anne Shirley é adotada por engano por dois irmãos idosos que esperavam um menino para ajudar na fazenda." },
    { titulo: "As Aventuras de Tom Sawyer - Mark Twain", autor: "Mark Twain", ano: 1876, editora: "Penguin", genero: "romance, humor", classificacao: "12+", sinopse: "As divertidas travessuras e o amadurecimento de um garoto órfão, sonhador e rebelde que, ao lado do amigo Huckleberry Finn, escapa das obrigações, presencia um assassinato misterioso e embarca em uma emocionante caça ao tesouro às margens do rio Mississippi." },
    { titulo: "As Crônicas de Nárnia - C.S. Lewis", autor: "C.S. Lewis", ano: 1950, editora: "HarperCollins", genero: "fantasia", classificacao: "9+", sinopse: "A série de C.S. Lewis acompanha crianças do nosso mundo que são transportadas para o reino mágico de Nárnia, onde animais falam, a magia é real e elas desempenham papéis épicos em batalhas atemporais entre o bem e o mal." },
    { titulo: "As Vinhas da Ira - John Steinbeck", autor: "John Steinbeck", ano: 1939, editora: "Record", genero: "romance, ficção", classificacao: "12+", sinopse: "A obra-prima de John Steinbeck narra a jornada épica da família Joad, que, após perder sua propriedade em Oklahoma devido à seca e à ganância dos bancos durante a Grande Depressão, migra para a Califórnia em busca de trabalho, dignidade e um recomeço." },
    { titulo: "Batman - O Cavaleiro das Trevas - Frank Miller", autor: "Frank Miller", ano: 1986, editora: "Panini", genero: "Super-herói", classificacao: "14 anos", sinopse: "Um Bruce Wayne mais velho e cansado volta a vestir o manto do Batman para salvar Gotham City." },
    { titulo: "Blue Lock Vol 1 - Muneyuki Kaneshiro", autor: "Muneyuki Kaneshiro", ano: 2018, editora: "Panini", genero: "Esporte", classificacao: "12 anos", sinopse: "Jovens atacantes competem em um treinamento extremo de futebol para criar o melhor jogador do mundo." },
    { titulo: "Capitães da Areia - Jorge Amado", autor: "Jorge Amado", ano: 1937, editora: "Companhia das Letras", genero: "romance, ficção", classificacao: "15+", sinopse: "A narrativa clássica de Jorge Amado acompanha a dura rotina de um bando de crianças e adolescentes abandonados que vivem em um trapiche em Salvador, sobrevivendo através de furtos e enfrentando a extrema pobreza." },
    { titulo: "Carrie, a Estranha - Stephen King", autor: "Stephen King", ano: 1974, editora: "Suma", genero: "terror, suspense", classificacao: "16+", sinopse: "Uma adolescente oprimida pela mãe fanática e alvo de bullying na escola descobre que possui poderes telecinéticos e usa sua mente para se vingar de forma devastadora durante o baile de formatura." },
    { titulo: "Casa-Grande & Senzala - Gilberto Freyre", autor: "Gilberto Freyre", ano: 1933, editora: "Global", genero: "ensaio sociológico, antropologia", classificacao: "16+", sinopse: "A obra fundante de Gilberto Freyre, publicada em 1933, analisa a formação da sociedade brasileira através da miscigenação e da interação entre portugueses, indígenas e negros, tendo a Casa-Grande (o poder patriarcal) e a Senzala (a exploração escravista) como núcleos da economia açucareira e das relações socioculturais coloniais." },
    { titulo: "Cem Anos de Solidão - Gabriel García Márquez", autor: "Gabriel García Márquez", ano: 1967, editora: "Record", genero: "romance", classificacao: "16+", sinopse: "A obra-prima de Gabriel García Márquez narra a saga de sete gerações da família Buendía na cidade fictícia de Macondo, explorando o amor, a loucura e o inevitável ciclo de solidão e repetição histórica que acompanha a estirpe." },
    { titulo: "Cidades de Papel - John Green", autor: "John Green", ano: 2008, editora: "Intrínseca", genero: "romance, ficção juvenil", classificacao: "14+", sinopse: "Em 'Cidades de Papel', de John Green, Quentin Jacobsen embarca em uma noite de aventuras com sua vizinha Margo." },
    { titulo: "Clube da Luta - Chuck Palahniuk", autor: "Chuck Palahniuk", ano: 1996, editora: "LeYa", genero: "romance, ficção", classificacao: "18+", sinopse: "Um jovem trabalhador com insônia, sufocado pelo consumismo, funda um clube de luta clandestino com um vendedor de sabonete carismático para escapar do vazio da vida moderna, desencadeando uma espiral de caos e anarquia." },
    { titulo: "Crime e Castigo - Fiódor Dostoiévski", autor: "Fiódor Dostoiévski", ano: 1866, editora: "34", genero: "romance", classificacao: "16+", sinopse: "A obra-prima de Fiódor Dostoiévski acompanha Raskólnikov, um estudante falido e atormentado que comete o assassinato de uma agiota em São Petersburgo" },
    { titulo: "Divergente - Veronica Roth", autor: "Veronica Roth", ano: 2011, editora: "Rocco", genero: "romance, ficção juvenil", classificacao: "14+", sinopse: "Em uma Chicago distópica, a sociedade é dividida em cinco facções. Beatrice Prior descobre ser uma 'Divergente' – alguém que não se encaixa em nenhum grupo específico – e precisa esconder seu segredo enquanto enfrenta uma iniciação mortal e descobre uma conspiração para destruir o sistema." },
    { titulo: "Dom Casmurro - Machado de Assis", autor: "Machado de Assis", ano: 1899, editora: "Companhia das Letras", genero: "romance", classificacao: "Livre", sinopse: "O protagonista Bentinho, já idoso, relembra sua juventude e reconstrói a história de amor com sua esposa Capitu, atormentado pela dúvida obsessiva de ter sido traído por ela com seu melhor amigo, deixando para o leitor o enigma sobre a veracidade do adultério." },
    { titulo: "Dom Quixote - Miguel de Cervantes", autor: "Miguel de Cervantes", ano: 1605, editora: "34", genero: "romance", classificacao: "14+", sinopse: "Um fidalgo espanhol enlouquece após ler incontáveis romances de cavalaria e decide viajar pelo mundo como um cavaleiro andante, acompanhado por seu fiel e realista escudeiro Sancho Pança, transformando a dura realidade em um cenário de aventuras fantásticas." },
    { titulo: "Doutor Jivago - Boris Pasternak", autor: "Boris Pasternak", ano: 1957, editora: "Companhia das Letras", genero: "romance histórico", classificacao: "12+", sinopse: "A obra-prima de Boris Pasternak narra a trajetória do médico e poeta Iúri Jivago enquanto sua vida pessoal, dividida entre sua esposa e a apaixonante Lara, é tragicamente consumida pelo caos, pelas guerras e pelas profundas transformações sociais da Revolução Russa." },
    { titulo: "Doutor Sono - Stephen King", autor: "Stephen King", ano: 2013, editora: "Suma", genero: "terror, suspense", classificacao: "16+", sinopse: "Em Doutor Sono, o agora adulto Dan Torrance tenta superar os traumas do Hotel Overlook. Ele usa seu 'brilho' para confortar pacientes terminais em um asilo, mas sua paz é ameaçada ao proteger Abra." },
    { titulo: "Dragon Ball Vol 1 - Akira Toriyama", autor: "Akira Toriyama", ano: 1984, editora: "Panini", genero: "Aventura", classificacao: "10 anos", sinopse: "Goku e Bulma partem em uma grande jornada para encontrar as mágicas Esferas do Dragão." },
    { titulo: "Extraordinário - R.J. Palacio", autor: "R.J. Palacio", ano: 2012, editora: "Intrínseca", genero: "ficção juvenil, romance", classificacao: "Livre", sinopse: "O livro Extraordinário acompanha August Pullman, um menino de 10 anos com uma severa deformidade facial." },
    { titulo: "Fahrenheit 451 - Ray Bradbury", autor: "Ray Bradbury", ano: 1953, editora: "Globo", genero: "romance, ficção", classificacao: "12+", sinopse: "Nesta distopia de Ray Bradbury, Guy Montag é um 'bombeiro' cuja profissão não é apagar incêndios, mas sim queimar livros." },
    { titulo: "Fortaleza Digital - Dan Brown", autor: "Dan Brown", ano: 1998, editora: "Arqueiro", genero: "suspense tecnológico", classificacao: "14+", sinopse: "O livro Fortaleza Digital acompanha Susan Fletcher, a principal criptógrafa da NSA, em uma corrida contra o tempo para decifrar um código indestrutível criado por um ex-funcionário, que ameaça expor os segredos de vigilância do governo americano para o mundo todo." },
    { titulo: "Gabriela, Cravo e Canela - Jorge Amado", autor: "Jorge Amado", ano: 1958, editora: "Companhia das Letras", genero: "romance modernista", classificacao: "14+", sinopse: "A obra narra o romance entre a sensual retirante Gabriela e o imigrante árabe Nacib, tendo como pano de fundo a Ilhéus da década de 1920" },
    { titulo: "Guerra e Paz - Liev Tolstói", autor: "Liev Tolstói", ano: 1869, editora: "Companhia das Letras", genero: "romance histórico", classificacao: "14+", sinopse: "A obra Guerra e Paz, de Liev Tolstói, narra a trajetória de cinco famílias aristocráticas russas enquanto a sociedade vive a brutal invasão e os impactos das guerras napoleônicas." },
    { titulo: "Haikyu!! Vol 1 - Haruichi Furudate", autor: "Haruichi Furudate", ano: 2012, editora: "JBC", genero: "Esporte", classificacao: "Livre", sinopse: "Hinata entra no time de vôlei do colégio para provar seu talento e superar seus rivais." },
    { titulo: "Hamlet - William Shakespeare", autor: "William Shakespeare", ano: 1603, editora: "L&PM", genero: "tragédia", classificacao: "14+", sinopse: "O príncipe da Dinamarca simula loucura para investigar a morte do pai e vingar-se do tio, que usurpou o trono e casou-se com sua mãe, em uma jornada marcada por tragédia, indecisão e dilemas morais" },
    { titulo: "Harry Potter e a Pedra Filosofal - J.K. Rowling", autor: "J.K. Rowling", ano: 1997, editora: "Rocco", genero: "fantasia, romance", classificacao: "Livre", sinopse: "Um órfão maltratado descobre no seu 11º aniversário que é um bruxo famoso." },
    { titulo: "Homem-Aranha - A Última Caçada de Kraven - J.M. DeMatteis", autor: "J.M. DeMatteis", ano: 1987, editora: "Panini", genero: "Super-herói", classificacao: "12 anos", sinopse: "O vilão Kraven tenta derrotar e tomar o lugar do Homem-Aranha de uma vez por todas." },
    { titulo: "Inferno - Dan Brown", autor: "Dan Brown", ano: 2013, editora: "Arqueiro", genero: "suspense, mistério", classificacao: "14+", sinopse: "O simbologista Robert Langdon acorda em Florença com amnésia e precisa decifrar enigmas baseados na obra de Dante Alighieri para impedir a liberação de um vírus letal" },
    { titulo: "Iracema - José de Alencar", autor: "José de Alencar", ano: 1865, editora: "Ática", genero: "narrativo, romance", classificacao: "16+", sinopse: "A obra Iracema de José de Alencar narra o romance proibido entre a índia tabajara Iracema, a 'virgem dos lábios de mel', e o colonizador português Martim" },
    { titulo: "Jane Eyre - Charlotte Brontë", autor: "Charlotte Brontë", ano: 1847, editora: "Penguin", genero: "romance", classificacao: "14+", sinopse: "O clássico romance de Charlotte Brontë acompanha a trajetória de uma órfã resiliente que, após uma infância de abusos e um período em um internato rigoroso, torna-se preceptora na mansão Thornfield" },
    { titulo: "Jogos Vorazes - Suzanne Collins", autor: "Suzanne Collins", ano: 2008, editora: "Rocco", genero: "ficção científica, distopia, ação", classificacao: "14+", sinopse: "Em um futuro pós-apocalíptico, jovens de 12 a 18 anos são sorteados para lutar até a morte em um reality show cruel organizado pela tirânica Capital" },
    { titulo: "Lira dos Vinte Anos - Álvares de Azevedo", autor: "Álvares de Azevedo", ano: 1853, editora: "Ática", genero: "lírico", classificacao: "12+", sinopse: "A obra Lira dos Vinte Anos de Álvares de Azevedo é uma coletânea poética da segunda geração romântica que oscila entre o amor platônico, a melancolia ultrarrromântica e o tédio existencial" },
    { titulo: "Lolita - Vladimir Nabokov", autor: "Vladimir Nabokov", ano: 1955, editora: "Companhia das Letras", genero: "romance", classificacao: "18+", sinopse: "O romance narra a obsessão doentia e criminosa do intelectual Humbert Humbert pela enteada de 12 anos, Dolores Haze" },
    { titulo: "Lucíola - José de Alencar", autor: "José de Alencar", ano: 1862, editora: "Ática", genero: "romance, ficção literária", classificacao: "12+", sinopse: "A obra narra a história de Paulo, um jovem ingênuo que chega ao Rio de Janeiro e se apaixona por Lúcia, uma cortesã de luxo" },
    { titulo: "Marina - Carlos Ruiz Zafón", autor: "Carlos Ruiz Zafón", ano: 1999, editora: "Suma", genero: "romance", classificacao: "14+", sinopse: "Marina acompanha a jornada de um jovem que descobre a história de um lugar misterioso e de uma amizade que atravessa o tempo e a memória." },
    { titulo: "Memórias Póstumas de Brás Cubas - Machado de Assis", autor: "Machado de Assis", ano: 1881, editora: "Companhia das Letras", genero: "romance, ficção literária", classificacao: "14+", sinopse: "o romance acompanha a trajetória do aristocrata Brás Cubas que, após morrer, decide escrever suas memórias da sepultura, revisitando com ironia e pessimismo suas ambições frustradas" },
    { titulo: "Moby Dick - Herman Melville", autor: "Herman Melville", ano: 1851, editora: "Cosac Naify", genero: "romance, aventura marítima", classificacao: "12+", sinopse: "O marinheiro Ismael embarca no navio baleeiro Pequod e narra a jornada obsessiva do capitão Ahab em busca de vingança contra Moby Dick, a gigantesca e temida baleia branca que lhe arrancou uma perna." },
    { titulo: "Morte e Vida Severina - João Cabral de Melo Neto", autor: "João Cabral de Melo Neto", ano: 1955, editora: "Nova Fronteira", genero: "poesia dramática", classificacao: "12+", sinopse: "A obra-prima de João Cabral de Melo Neto narra a trajetória de Severino, um retirante sertanejo que foge da seca e da miséria extrema no agreste pernambucano" },
    { titulo: "My Hero Academia Vol 1 - Kohei Horikoshi", autor: "Kohei Horikoshi", ano: 2014, editora: "JBC", genero: "Ação", classificacao: "12 anos", sinopse: "Um garoto sem poderes ganha a chance de estudar na maior escola de super-heróis do mundo." },
    { titulo: "Noite na Taverna - Álvares de Azevedo", autor: "Álvares de Azevedo", ano: 1855, editora: "Ática", genero: "prosa de ficção, literatura gótica", classificacao: "16+", sinopse: "O livro Noite na Taverna de Álvares de Azevedo apresenta cinco amigos boêmios que, durante uma noite chuvosa em uma taverna, compartilham histórias assustadoras e macabras de seus passados repletos de amores impossíveis" },
    { titulo: "O Alienista - Machado de Assis", autor: "Machado de Assis", ano: 1882, editora: "Companhia das Letras", genero: "novela", classificacao: "12+", sinopse: "A obra de Machado de Assis narra a história do médico Simão Bacamarte, que, ao fundar um hospício na cidade de Itaguaí, passa a internar quase toda a população sob critérios cada vez mais arbitrários, satirizando os limites da razão, a ciência e a busca absoluta pelo poder" },
    { titulo: "O Apanhador no Campo de Centeio - J.D. Salinger", autor: "J.D. Salinger", ano: 1951, editora: "Editora do Autor", genero: "romance, ficção juvenil", classificacao: "14+", sinopse: "Holden Caulfield, um adolescente revoltado e em crise com o mundo adulto, vaga por Nova York durante três dias após ser expulso do internato, lidando com a perda da inocência e a hipocrisia da sociedade" },
    { titulo: "O Auto da Compadecida - Ariano Suassuna", autor: "Ariano Suassuna", ano: 1955, editora: "Agir", genero: "dramático", classificacao: "Livre", sinopse: "A história acompanha as aventuras de João Grilo e Chicó, dois amigos nordestinos que sobrevivem no sertão à base de muita astúcia e mentira." },
    { titulo: "O Código Da Vinci - Dan Brown", autor: "Dan Brown", ano: 2003, editora: "Arqueiro", genero: "romance, suspense, mistério", classificacao: "14+", sinopse: "Um assassinato no Museu do Louvre leva o simbologista Robert Langdon e a criptógrafa Sophie Neveu a decifrar mensagens ocultas nas obras de Leonardo da Vinci" },
    { titulo: "O Conde de Monte Cristo - Alexandre Dumas", autor: "Alexandre Dumas", ano: 1844, editora: "Zahar", genero: "romance de aventura", classificacao: "14+", sinopse: "Um marinheiro traído por amigos invejosos é preso injustamente, mas após anos de sofrimento, consegue fugir, enriquece e retorna como o misterioso Conde de Monte Cristo para se vingar metodicamente de todos os responsáveis por sua ruína." },
    { titulo: "O Cortiço - Aluísio Azevedo", autor: "Aluísio Azevedo", ano: 1890, editora: "Ática", genero: "romance", classificacao: "15+", sinopse: "A obra analisa a habitação coletiva como um organismo vivo onde o meio e os instintos determinam o comportamento humano." },
    { titulo: "O Diário de Anne Frank - Anne Frank", autor: "Anne Frank", ano: 1947, editora: "Record", genero: "autobiografia, narrativa pessoal", classificacao: "12+", sinopse: "O Diário de Anne Frank - Anne Frank." },
    { titulo: "O Estrangeiro - Albert Camus", autor: "Albert Camus", ano: 1942, editora: "Record", genero: "ficção filosófica, romance", classificacao: "14+", sinopse: "A obra narra a história de Meursault, um homem apático e indiferente às convenções sociais." },
    { titulo: "O Grande Gatsby - F. Scott Fitzgerald", autor: "F. Scott Fitzgerald", ano: 1925, editora: "Penguin", genero: "romance, tragédia", classificacao: "14+", sinopse: "um jovem misterioso e milionário chamado Jay Gatsby faz de tudo para reconquistar Daisy Buchanan, seu grande amor do passado, enquanto a narrativa expõe o vazio e a decadência da alta sociedade americana na década de 1920" },
    { titulo: "O Guarani - José de Alencar", autor: "José de Alencar", ano: 1857, editora: "Ática", genero: "romance", classificacao: "Livre", sinopse: "O Guarani narra o amor impossível e idealizado entre Peri, um guerreiro indígena nobre, e Ceci, filha de um fidalgo português, cujo romance culmina na salvação da amada em meio aos conflitos trágicos e culturais do Brasil colonial." },
    { titulo: "O Hobbit - J.R.R. Tolkien", autor: "J.R.R. Tolkien", ano: 1937, editora: "HarperCollins", genero: "literatura fantástica, literatura juvenil", classificacao: "10+", sinopse: "O hobbit Bilbo Bolseiro deixa sua vida pacata para acompanhar o mago Gandalf e treze anões em uma perigosa jornada pela Terra-média, com o objetivo de recuperar um tesouro ancestral roubado pelo temido dragão Smaug" },
    { titulo: "O Homem que Calculava - Malba Tahan", autor: "Malba Tahan", ano: 1938, editora: "Record", genero: "ficção, romance infanto-juvenil", classificacao: "14+", sinopse: "O Homem que Calculava narra as aventuras de Beremiz Samir, um genial calculista persa que viaja pela antiga Arábia usando seu raciocínio lógico e talento matemático para solucionar problemas cotidianos aparentemente impossíveis, encantando califas e sábios pelo caminho." },
    { titulo: "O Iluminado - Stephen King", autor: "Stephen King", ano: 1977, editora: "Suma", genero: "romance, terror", classificacao: "14+", sinopse: "Um escritor alcoólatra aceita um emprego de zelador em um hotel isolado nas montanhas durante o inverno. Ele se muda para o local com a esposa e o filho pequeno — que possui habilidades psíquicas." },
    { titulo: "O Jogo do Anjo - Carlos Ruiz Zafón", autor: "Carlos Ruiz Zafón", ano: 2008, editora: "Suma", genero: "romance, ficção, suspense", classificacao: "16+", sinopse: "Em Barcelona nos anos 1920, um escritor atormentado e com uma doença terminal aceita a proposta misteriosa de um editor para criar um livro único em troca de fortuna e cura, descobrindo que a obra esconde pactos sombrios" },
    { titulo: "O Lobo da Estepe - Hermann Hesse", autor: "Hermann Hesse", ano: 1927, editora: "Record", genero: "romance", classificacao: "16+", sinopse: "A obra-prima existencialista de Hermann Hesse retrata Harry Haller, um intelectual de 50 anos em crise com a sociedade burguesa" },
    { titulo: "O Morro dos Ventos Uivantes - Emily Brontë", autor: "Emily Brontë", ano: 1847, editora: "Penguin", genero: "romance de tragédia, drama", classificacao: "14+", sinopse: "Uma trágica e obsessiva história de amor e vingança entre Heathcliff e Catherine Earnshaw, cujo romance proibido e desencontros moldam um ciclo de destruição que atravessa gerações na sombria paisagem rural da Inglaterra" },
    { titulo: "O Nome da Rosa - Umberto Eco", autor: "Umberto Eco", ano: 1980, editora: "Record", genero: "romance, mistério", classificacao: "16+", sinopse: "A trama segue o frei Guilherme de Baskerville e seu noviço Adso de Melk enquanto investigam uma série de assassinatos misteriosos em uma abadia italiana, cujos crimes estão ligados à sua vasta e secreta biblioteca" },
    { titulo: "O Pagador de Promessas - Dias Gomes", autor: "Dias Gomes", ano: 1960, editora: "Bertrand Brasil", genero: "drama", classificacao: "12+", sinopse: "A obra conta a história trágica de Zé do Burro, que viaja de sua aldeia, no interior da Bahia, até Salvador carregando uma cruz. Seu objetivo era depositá-la no altar a fim de agradecer a Santa Bárbara (lansã) a salvação de seu burro Nicolau, que estava doente" },
    { titulo: "O Pequeno Príncipe - Antoine de Saint-Exupéry", autor: "Antoine de Saint-Exupéry", ano: 1943, editora: "Agir", genero: "literatura infantil, fábula, fantasia", classificacao: "Livre", sinopse: "Um piloto cai com seu avião no deserto do Saara e encontra um menino misterioso de cabelos dourados, originário de um asteroide minúsculo" },
    { titulo: "O Perfume - Patrick Süskind", autor: "Patrick Süskind", ano: 1985, editora: "Record", genero: "romance, ficção policial, mistério", classificacao: "18+", sinopse: "Na França do século XVIII, Jean-Baptiste Grenouille, um jovem com um olfato sobre-humano e sem cheiro próprio, torna-se um perfumista obcecado." },
    { titulo: "O Povo Brasileiro - Darcy Ribeiro", autor: "Darcy Ribeiro", ano: 1995, editora: "Companhia das Letras", genero: "ensaio sociológico", classificacao: "12+", sinopse: "O livro 'O Povo Brasileiro', de Darcy Ribeiro, investiga a formação da identidade nacional através da fusão violenta e miscigenada de três matrizes: indígenas, africanos e europeus, resultando na criação de um povo novo com cultura e destino singulares." },
    { titulo: "O Processo - Franz Kafka", autor: "Franz Kafka", ano: 1925, editora: "Companhia das Letras", genero: "romance, humor, ficção distópica", classificacao: "16+", sinopse: "um bancário que é subitamente preso e submetido a um processo judicial interminável e labiríntico" },
    { titulo: "O Quinze - Rachel de Queiroz", autor: "Rachel de Queiroz", ano: 1930, editora: "José Olympio", genero: "romance", classificacao: "14+", sinopse: "A obra O Quinze relata a trágica seca de 1915 no Ceará através de dois núcleos: a luta pela sobrevivência e o êxodo do vaqueiro Chico Bento e sua família, intercalados com a história de amor entre a professora Conceição e o vaqueiro Vicente." },
    { titulo: "O Senhor dos Anéis - J.R.R. Tolkien", autor: "J.R.R. Tolkien", ano: 1954, editora: "HarperCollins", genero: "literatura fantástica", classificacao: "9+", sinopse: "Um pequeno hobbit recebe a missão de destruir um anel mágico e maligno na Montanha da Perdição, liderando uma sociedade de heróis para salvar a Terra-Média das garras do Senhor do Escuro, Sauron." },
    { titulo: "O Silêncio dos Inocentes - Thomas Harris", autor: "Thomas Harris", ano: 1988, editora: "Record", genero: "romance, suspense", classificacao: "16+", sinopse: "Para capturar o serial killer 'Buffalo Bill', a agente do FBI Clarice Starling busca a ajuda do psiquiatra canibal Dr. Hannibal Lecter, iniciando um jogo psicológico onde ela precisa trocar segredos do próprio passado pelas pistas necessárias para encontrar o assassino" },
    { titulo: "O Sol é para Todos - Harper Lee", autor: "Harper Lee", ano: 1960, editora: "José Olympio", genero: "romance, ficção", classificacao: "14+", sinopse: "Em O Sol é para Todos de Harper Lee, a história acompanha um advogado que enfrenta o racismo extremo no Alabama dos anos 1930 ao defender um homem negro injustamente acusado de estupro, tudo sob a perspectiva sensível e questionadora de sua filha pequena" },
    { titulo: "O Símbolo Perdido - Dan Brown", autor: "Dan Brown", ano: 2009, editora: "Arqueiro", genero: "suspense, mistério", classificacao: "14", sinopse: "O simbologista Robert Langdon é atraído a uma armadilha no Capitólio dos EUA e precisa decifrar códigos maçônicos por Washington, D.C., para salvar a vida de seu mentor sequestrado e desvendar um antigo segredo" },
    { titulo: "O Tempo e o Vento - Érico Veríssimo", autor: "Érico Veríssimo", ano: 1949, editora: "Companhia das Letras", genero: "romance histórico", classificacao: "14+", sinopse: "A obra-prima O Tempo e o Vento de Érico Veríssimo narra a saga da família Terra-Cambará ao longo de duzentos anos (1745-1945), entrelaçando a formação e a transformação histórica, social e cultural do Rio Grande do Sul e do Brasil" },
    { titulo: "One Piece Vol 1 - Eiichiro Oda", autor: "Eiichiro Oda", ano: 1997, editora: "Panini", genero: "Aventura", classificacao: "10 anos", sinopse: "Luffy inicia sua jornada para reunir uma tripulação e se tornar o Rei dos Piratas." },
    { titulo: "Orgulho e Preconceito - Jane Austen", autor: "Jane Austen", ano: 1813, editora: "Penguin", genero: "ficção, romance de amor", classificacao: "12+", sinopse: "A obra acompanha Elizabeth Bennet na Inglaterra do século XIX, cujo destino muda com a chegada do rico Sr. Darcy" },
    { titulo: "Os Miseráveis - Victor Hugo", autor: "Victor Hugo", ano: 1862, editora: "Martin Claret", genero: "romance, tragédia", classificacao: "12+", sinopse: "A saga acompanha o ex-presidiário Jean Valjean que, após ser condenado por roubar um pão, busca redenção e uma nova vida acolhendo a órfã Cosette, enquanto é implacavelmente perseguido pelo inspetor Javert na França do século XIX." },
    { titulo: "Os Sertões - Euclides da Cunha", autor: "Euclides da Cunha", ano: 1902, editora: "Companhia das Letras", genero: "relato histórico, ensaio sociológico", classificacao: "12+", sinopse: "Os Sertões narra a trágica Guerra de Canudos (1896-1897), unindo literatura e reportagem para expor o massacre de sertanejos pelo Exército" },
    { titulo: "Pollyanna - Eleanor H. Porter", autor: "Eleanor H. Porter", ano: 1913, editora: "Autêntica", genero: "literatura infantojuvenil", classificacao: "10+", sinopse: "A história acompanha uma órfã otimista de 11 anos que vai morar com sua tia rica e severa." },
    { titulo: "Psicose - Robert Bloch", autor: "Robert Bloch", ano: 1959, editora: "Darkside", genero: "romance, suspense", classificacao: "14+", sinopse: "Em Psicose, de Robert Bloch, uma mulher em fuga após roubar dinheiro da empresa onde trabalha se hospeda no isolado Bates Motel, onde conhece Norman Bates, um homem perturbado e dominado por uma mãe controladora" },
    { titulo: "Quincas Borba - Machado de Assis", autor: "Machado de Assis", ano: 1891, editora: "Companhia das Letras", genero: "romance, ficção", classificacao: "14+", sinopse: "O ingênuo professor Rubião herda a imensa fortuna do filósofo criador do 'Humanitismo', com a condição de cuidar de seu cachorro." },
    { titulo: "Ratos e Homens - John Steinbeck", autor: "John Steinbeck", ano: 1937, editora: "Record", genero: "ficção histórica, novela", classificacao: "14+", sinopse: "A narrativa acompanha George e Lennie, dois trabalhadores rurais migrantes na Califórnia durante a Grande Depressão, que lutam para sobreviver enquanto tentam realizar o sonho de possuir seu próprio pedaço de terra." },
    { titulo: "Romeu e Julieta - William Shakespeare", autor: "William Shakespeare", ano: 1597, editora: "L&PM", genero: "dramático", classificacao: "12+", sinopse: "A clássica tragédia de William Shakespeare, ambientada em Verona, narra a paixão proibida entre Romeu Montéquio e Julieta Capuleto. Pertencentes a famílias rivais, eles enfrentam o ódio geracional." },
    { titulo: "Sandman - Prelúdios e Noturnos - Neil Gaiman", autor: "Neil Gaiman", ano: 1989, editora: "Panini", genero: "Fantasia", classificacao: "16 anos", sinopse: "Morpheus, o rei dos sonhos, se liberta após décadas aprisionado e busca recuperar seus objetos de poder." },
    { titulo: "São Bernardo - Graciliano Ramos", autor: "Graciliano Ramos", ano: 1934, editora: "Record", genero: "romance", classificacao: "Livre", sinopse: "A obra narra a trajetória de Paulo Honório, um homem de origem humilde que ascende à riqueza e compra a fazenda São Bernardo com astúcia e crueldade" },
    { titulo: "Senhora - José de Alencar", autor: "José de Alencar", ano: 1875, editora: "Ática", genero: "romance", classificacao: "15+", sinopse: "Aurélia Camargo, uma jovem órfã que enriquece após receber uma herança, usa sua fortuna para 'comprar' como marido Fernando Seixas, o homem que a havia abandonado por uma união mais vantajosa financeiramente, transformando o casamento em uma relação de vingança e ajuste de contas." },
    { titulo: "Sidarta - Hermann Hesse", autor: "Hermann Hesse", ano: 1922, editora: "Record", genero: "romance, ficção", classificacao: "16+", sinopse: "A obra-prima de Hermann Hesse narra a jornada espiritual de um jovem indiano que abandona uma vida de privilégios para buscar a verdadeira iluminação através de experiências que vão do ascetismo rigoroso aos prazeres mundanos" },
    { titulo: "V de Vingança - Alan Moore", autor: "Alan Moore", ano: 1982, editora: "Panini", genero: "Ficção Científica", classificacao: "16 anos", sinopse: "Um vigilante mascarado usa táticas extremas para derrubar um governo ditatorial em um futuro distópico." },
    { titulo: "Vidas Secas - Graciliano Ramos", autor: "Graciliano Ramos", ano: 1938, editora: "Record", genero: "romance, ficção", classificacao: "14+", sinopse: "A obra-prima de Graciliano Ramos narra a trajetória de uma família de retirantes e sua cachorra (Baleia) no sertão nordestino, lutando desesperadamente contra a seca, a fome e a exploração social em busca de melhores condições de vida." },
    {titulo: "Evangelion Vol01", autor: "Hideaki Anno", ano: 1994, editora: "Jbc", genero: "Drama, Mangá", classificacao: "+16", sinopse: "Em um mundo pós-apocalíptico, a organização paramilitar NERV recruta adolescentes para pilotar robôs gigantes chamados Evangelions." },
    {titulo: "Five Nights at Freddy's - Into the Pit", autor: "Scoot Cawthon", ano: 2019, editora: "Panini", genero: "Terror, Drama", classificacao: "+10", sinopse: "A narrativa que dá nome ao livro, Into the Pit, acompanha Oswald, um menino de 10 anos que descobre uma piscina de bolinhas em uma pizzaria abandonada capaz de mandá-lo de volta ao ano de 1985"},
    { titulo: "Watchmen - Alan Moore", autor: "Alan Moore", ano: 1986, editora: "Panini", genero: "Mistério", classificacao: "16 anos", sinopse: "Antigos vigilantes mascarados investigam uma grande conspiração após o assassinato de um colega." }
];

// ==========================================
// 2. LISTA DE FRASES
// ==========================================
const FRASES_INICIAIS = [
    { texto: "A leitura é uma forma de viajar sem sair do lugar.", autor: "Eça de Queirós" },
    { texto: "Ler é sonhar pela mão de outro.", autor: "Fernando Pessoa" },
    { texto: "O livro é um mestre que fala sem voz.", autor: "Provérbio chinês" },
    { texto: "A vida é muito curta para ser pequena.", autor: "Benjamin Disraeli" },
    { texto: "Não há nada mais prazeroso do que aprender.", autor: "Marcus Tullius Cicero" },
    { texto: "O que vale na vida não é o ponto de partida, mas a caminhada.", autor: "Milton Nascimento" },
    { texto: "A imaginação governa o mundo.", autor: "Napoleão Bonaparte" },
    { texto: "Quem lê vive muitas vidas.", autor: "George R.R. Martin" },
    { texto: "Um leitor vive mil vidas antes de morrer.", autor: "George R.R. Martin" },
    { texto: "A leitura é para a mente o que o exercício é para o corpo.", autor: "Joseph Addison" },
    { texto: "O importante é não parar de questionar.", autor: "Albert Einstein" },
    { texto: "A beleza está nos olhos de quem vê.", autor: "Oscar Wilde" },
    { texto: "A esperança é a última que morre.", autor: "Provérbio" },
    { texto: "Não existem limites para o conhecimento.", autor: "Carl Sagan" },
    { texto: "A verdade é como o sol: pode ser ofuscante, mas não pode ser negada.", autor: "Buda" },
    { texto: "Ler é abrir uma porta para o mundo.", autor: "Monteiro Lobato" },
    { texto: "O saber não ocupa lugar.", autor: "Provérbio" },
    { texto: "A vida é uma viagem, não um destino.", autor: "Ralph Waldo Emerson" },
    { texto: "O amor é a única força capaz de transformar um inimigo em amigo.", autor: "Martin Luther King" },
    { texto: "A verdadeira viagem de descobrimento não consiste em procurar novas paisagens, mas em ter novos olhos.", autor: "Marcel Proust" },
    { texto: "A leitura nos dá asas para voar.", autor: "Victor Hugo" },
    { texto: "O futuro pertence àqueles que acreditam na beleza de seus sonhos.", autor: "Eleanor Roosevelt" },
    { texto: "A gentileza é a linguagem que o surdo ouve e o cego vê.", autor: "Mark Twain" },
    { texto: "A vida é o que acontece enquanto você faz planos.", autor: "John Lennon" },
    { texto: "Não tenha medo de ser feliz.", autor: "Chico Xavier" },
    { texto: "O destino não é uma questão de sorte, mas de escolha.", autor: "William Jennings Bryan" },
    { texto: "A criatividade é a inteligência se divertindo.", autor: "Albert Einstein" },
    { texto: "A força não vem da capacidade física, mas de uma vontade indomável.", autor: "Mahatma Gandhi" },
    { texto: "A jornada mais longa começa com um único passo.", autor: "Lao Tsé" },
    { texto: "O coração tem razões que a própria razão desconhece.", autor: "Blaise Pascal" }
];

// ==========================================
// 3. USUÁRIOS FIXOS (10)
// ==========================================
const USUARIOS_FIXOS = [
    { nome: 'Julia Akemi', apelido: 'Juch', cpf: '111.111.111-11', foto: 'ju.jpg', livros_lidos: 29, media_estrelas: 4.5, lendo_agora: 'Evangelion', senha: '1234' },
    { nome: 'Gustavo Pelepe', apelido: 'Guspelepe', cpf: '222.222.222-22', foto: 'gu.jpg', livros_lidos: 10, media_estrelas: 3.5, lendo_agora: 'Haikyu', senha: '1234' },
    { nome: 'Ronaldo Karas', apelido: 'Karas', cpf: '333.333.333-33', foto: 'karas.jpg', livros_lidos: 12, media_estrelas: 4.0, lendo_agora: 'Python Avançado', senha: '1234' },
    { nome: 'Douglas Becker', apelido: 'Douglas404', cpf: '444.444.444-44', foto: 'douglas.jpg', livros_lidos: 14, media_estrelas: 3.0, lendo_agora: 'O Hobbit', senha: '1234' },
    { nome: 'Mariana Oliveira', apelido: 'Mary', cpf: '555.555.555-55', foto: 'mariana.jpg', livros_lidos: 18, media_estrelas: 4.2, lendo_agora: 'Dom Casmurro', senha: '1234' },
    { nome: 'Felipe Santos', apelido: 'Felps', cpf: '666.666.666-66', foto: 'felipe.jpg', livros_lidos: 9, media_estrelas: 3.8, lendo_agora: 'One Piece', senha: '1234' },
    { nome: 'Camila Ferreira', apelido: 'Cami', cpf: '777.777.777-77', foto: 'camila.jpg', livros_lidos: 26, media_estrelas: 4.9, lendo_agora: 'Orgulho e Preconceito', senha: '1234' },
    { nome: 'Lucas Almeida', apelido: 'Luquinhas', cpf: '888.888.888-88', foto: 'lucas.jpg', livros_lidos: 16, media_estrelas: 4.1, lendo_agora: 'Clean Code', senha: '1234' },
    { nome: 'Beatriz Costa', apelido: 'Bia', cpf: '999.999.999-99', foto: 'bia.jpg', livros_lidos: 21, media_estrelas: 4.7, lendo_agora: 'Percy Jackson', senha: '1234' },
    { nome: 'Henrique Martins', apelido: 'HMartins', cpf: '101.010.101-01', foto: 'henrique.jpg', livros_lidos: 13, media_estrelas: 3.9, lendo_agora: '1984', senha: '1234' }
];

// ==========================================
// 4. TÍTULOS POPULARES e COMENTÁRIOS (para avaliações)
// ==========================================
const TITULOS_POPULARES = [
    'Berserk vol. 32', 'One Piece vol. 100', 'Attack on Titan vol. 1', 
    'Demon Slayer vol. 1', 'Death Note vol. 1', 'Fullmetal Alchemist vol. 1',
    'Naruto vol. 1', 'Dragon Ball vol. 1', 'Sailor Moon vol. 1',
    'Ghost in the Shell', 'Akira', 'Vagabond vol. 1', 'Monster vol. 1',
    '20th Century Boys vol. 1', 'Gantz vol. 1', 'Tokyo Ghoul vol. 1',
    'Jujutsu Kaisen vol. 1', 'Chainsaw Man vol. 1', 'Spy x Family vol. 1',
    'My Hero Academia vol. 1', 'Hunter x Hunter vol. 1',
    'Watchmen', 'Sandman vol. 1', 'The Walking Dead vol. 1', 'V for Vendetta',
    'Batman: O Cavaleiro das Trevas', 'Batman: Ano Um', 'Superman: As Quatro Estações',
    'Spider-Man: Azul', 'X-Men: Dias de um Futuro Esquecido', 'Hellboy vol. 1',
    'Preacher vol. 1', 'Fables vol. 1', 'Saga vol. 1', 'Monstress vol. 1',
    'Paper Girls vol. 1', 'Descender vol. 1', 'Locke & Key vol. 1',
    'Duna - Frank Herbert', 'Fundação - Isaac Asimov', 'Neuromancer - William Gibson',
    'O Nome do Vento - Patrick Rothfuss', 'O Temor do Sábio - Patrick Rothfuss',
    'A Roda do Tempo vol. 1 - Robert Jordan', 'O Caminho dos Reis - Brandon Sanderson',
    'Palavras de Radiância - Brandon Sanderson', 'O Último Reino - Bernard Cornwell',
    'Os Pilares da Terra - Ken Follett', 'O Trono de Vidro - Sarah J. Maas',
    'Corte de Espinhos e Rosas - Sarah J. Maas', 'Six of Crows - Leigh Bardugo',
    'A Queda dos Deuses - Dan Simmons', 'Hyperion - Dan Simmons',
    'A Máquina do Tempo - H.G. Wells', 'O Mundo Perdido - Arthur Conan Doyle',
    'O Conto da Aia - Margaret Atwood', 'Os Testamentos - Margaret Atwood',
    'O Circo da Noite - Erin Morgenstern', 'A Biblioteca da Meia-Noite - Matt Haig',
    'Projeto Hail Mary - Andy Weir', 'O Marciano - Andy Weir',
    'A Quinta Onda - Rick Yancey', 'A Maze Runner - James Dashner'
];

const COMENTARIOS = [
    'Adorei!', 'Muito bom.', 'Interessante.', 'Recomendo.', 'Poderia ser melhor.',
    'Fantástico!', 'Leitura obrigatória.', 'Não gostei muito.', 'Excelente!', 'Mediano.',
    'Surpreendente!', 'Foi fraco.', 'Clássico!', 'Emocionante.', 'Divertido.',
    'Profundo.', 'Leve e gostoso.', 'Viciante.', 'Esperava mais.', 'Perfeito!',
    'Um dos melhores que já li!', 'Não é para qualquer um.', 'Me fez pensar muito.',
    'Ação do começo ao fim.', 'Final decepcionante.', 'Gostei da escrita.',
    'Personagens incríveis.', 'Mundo muito bem construído.', 'Ritmo lento demais.'
];

// ==========================================
// FUNÇÃO DE MIGRAÇÃO PARA CAMPOS DOS LIVROS
// ==========================================
async function migrarLivros() {
    try {
        const livrosDB = await db.livros.toArray();
        if (livrosDB.length === 0) return;

        let atualizados = 0;
        for (const livroDB of livrosDB) {
            const livroNovo = LIVROS_INICIAIS.find(l => l.titulo === livroDB.titulo);
            if (!livroNovo) continue;

            const precisaAtualizar = 
                livroDB.genero !== livroNovo.genero ||
                livroDB.classificacao !== livroNovo.classificacao ||
                livroDB.sinopse !== livroNovo.sinopse;

            if (precisaAtualizar) {
                await db.livros.update(livroDB.id, {
                    genero: livroNovo.genero || '',
                    classificacao: livroNovo.classificacao || 'Livre',
                    sinopse: livroNovo.sinopse || 'Sinopse não disponível.'
                });
                atualizados++;
            }
        }
        if (atualizados > 0) {
            console.warn(` ${atualizados} livros atualizados com novos campos.`);
        }
    } catch (err) {
        console.error(' Erro na migração de livros:', err);
    }
}

// ==========================================
// MIGRAÇÃO PARA ADICIONAR CAMPO CAPA
// ==========================================
async function migrarCapa() {
    try {
        const livrosDB = await db.livros.toArray();
        let atualizados = 0;
        for (const livro of livrosDB) {
            if (livro.capa === undefined) {
                await db.livros.update(livro.id, { capa: '' });
                atualizados++;
            }
        }
        if (atualizados > 0) {
            console.warn(` ${atualizados} livros receberam o campo capa.`);
        }
    } catch (err) {
        console.error(' Erro na migração de capa:', err);
    }
}

// ==========================================
// FUNÇÃO DE SINCRONIZAÇÃO DE LIVROS (adiciona novos e remove os que saíram)
// ==========================================
// ==========================================
// FUNÇÃO DE SINCRONIZAÇÃO DE LIVROS (apenas adiciona, NÃO remove)
// ==========================================
async function sincronizarLivros() {
    try {
        const livrosExistentes = await db.livros.toArray();
        const titulosExistentes = new Set(livrosExistentes.map(l => l.titulo));

        // Adiciona livros novos que não existem
        let adicionados = 0;
        for (const livroNovo of LIVROS_INICIAIS) {
            if (!titulosExistentes.has(livroNovo.titulo)) {
                await db.livros.add(livroNovo);
                adicionados++;
            }
        }
        if (adicionados > 0) {
            console.warn(` ${adicionados} novos livros adicionados.`);
        }

        // ==========================================
        // A REMOÇÃO DE LIVROS FOI REMOVIDA PARA SEGURANÇA.
        // Livros adicionados manualmente (pelo admin)
        // NUNCA serão removidos automaticamente.
        // Para excluir um livro, use a interface "Editar Livros".
        // ==========================================

    } catch (err) {
        console.error(' Erro ao sincronizar livros:', err);
    }
}

// ==========================================
// 5. FUNÇÃO DE SEED (usuários fixos + avaliações)
// ==========================================
async function seedDatabase() {
    try {
        const existing = await db.clientes.where('foto').notEqual('').toArray();
        if (existing.length >= 10) {
            console.warn(`⏭ Já existem ${existing.length} usuários. Pulando seed.`);
            return;
        }

        if (existing.length > 0) {
            for (let u of existing) await db.clientes.delete(u.id);
            const ids = existing.map(u => u.id);
            await db.avaliacoes.where('usuario_id').anyOf(ids).delete();
            console.warn(' Usuários antigos removidos.');
        }

        console.warn(' Criando 10 usuários fixos...');

        for (const usuario of USUARIOS_FIXOS) {
            const id = await db.clientes.add({
                nome: usuario.nome,
                apelido: usuario.apelido,
                cpf: usuario.cpf,
                foto: `static/src/avatares/${usuario.foto}`,
                livros_lidos: usuario.livros_lidos,
                media_estrelas: usuario.media_estrelas,
                lendo_agora: usuario.lendo_agora,
                senha: usuario.senha,
                nascimento: '1990-01-01',
                bio: ''
            });

            // Gera 5-8 avaliações para cada
            const numAval = Math.floor(Math.random() * 4) + 5;
            for (let j = 0; j < numAval; j++) {
                const livro = TITULOS_POPULARES[Math.floor(Math.random() * TITULOS_POPULARES.length)];
                const nota = parseFloat((Math.random() * 4 + 1).toFixed(1));
                const coment = COMENTARIOS[Math.floor(Math.random() * COMENTARIOS.length)];
                const dias = Math.floor(Math.random() * 60);
                const data = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                await db.avaliacoes.add({
                    livro,
                    usuario_id: id,
                    nota,
                    comentario: coment,
                    data
                });
            }
        }

        // Avaliações extras para o usuário teste
        const usuarioTeste = await db.clientes.where('cpf').equals('111.222.333-44').first();
        if (usuarioTeste) {
            const numAvalTeste = Math.floor(Math.random() * 4) + 4;
            for (let j = 0; j < numAvalTeste; j++) {
                const livro = TITULOS_POPULARES[Math.floor(Math.random() * TITULOS_POPULARES.length)];
                const nota = parseFloat((Math.random() * 4 + 1).toFixed(1));
                const coment = COMENTARIOS[Math.floor(Math.random() * COMENTARIOS.length)];
                const dias = Math.floor(Math.random() * 30);
                const data = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                await db.avaliacoes.add({
                    livro,
                    usuario_id: usuarioTeste.id,
                    nota,
                    comentario: coment,
                    data
                });
            }
        }

        console.warn('Seed concluído.');
    } catch (err) {
        console.error('Erro no seed:', err);
    }
}

// ==========================================
// 6. FUNÇÃO PARA POPULAR FRASES
// ==========================================
async function popularFrases() {
    const count = await db.frases.count();
    if (count === 0) {
        await db.frases.bulkAdd(FRASES_INICIAIS);
        console.warn('Frases inicializadas.');
    }
}

// ==========================================
// 7. INICIALIZAÇÃO DO BANCO
// ==========================================
db.on('ready', async () => {
    try {
        console.warn('Inicializando banco...');

        // 1. Livros – inicializa, migra campos e sincroniza
        const countLivros = await db.livros.count();
        if (countLivros === 0) {
            await db.livros.bulkAdd(LIVROS_INICIAIS);
            console.warn(` ${LIVROS_INICIAIS.length} livros inicializados.`);
        } else {
            console.warn(` Já existem ${countLivros} livros.`);
            await migrarLivros();
            await sincronizarLivros();
            await migrarCapa();  // <-- garante o campo capa
        }

        // 2. Cliente padrão
        const clientePadrao = await db.clientes.where('cpf').equals('111.222.333-44').first();
        if (!clientePadrao) {
            await db.clientes.add({
                nome: 'Usuário Teste',
                apelido: 'Teste',
                cpf: '111.222.333-44',
                nascimento: '1990-01-01',
                senha: '123456',
                foto: '',
                livros_lidos: 0,
                media_estrelas: 0,
                lendo_agora: '',
                bio: ''
            });
            console.warn('👤 Cliente padrão criado.');
        } else if (clientePadrao.senha !== '123456') {
            await db.clientes.update(clientePadrao.id, { senha: '123456' });
        }

        // 3. Corrigir senhas antigas
        const semSenha = await db.clientes.filter(c => !c.senha).toArray();
        for (let c of semSenha) {
            await db.clientes.update(c.id, { senha: '123456' });
            console.warn(` Cliente "${c.nome}" recebeu senha padrão.`);
        }

        // 4. Seed de usuários fixos
        await seedDatabase();

        // 5. Frases
        await popularFrases();

        console.warn('Banco de dados pronto.');
    } catch (err) {
        console.error('Erro na inicialização:', err);
    }
});