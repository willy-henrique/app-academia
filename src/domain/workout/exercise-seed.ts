import { exerciseSchema, type Exercise } from "./exercise";

const seedExerciseRecords = [
  {
    "id": "barbell-bench-press",
    "name": "Supino reto com barra",
    "slug": "supino-reto-barra",
    "description": "Exercício fundamental de empurrar horizontal com barra e banco reto para desenvolvimento de peitorais e tríceps.",
    "execution": "Descer a barra de forma controlada até a linha média do peitoral e empurrar mantendo as escápulas aduzidas e os pés firmes no solo.",
    "instructions": "1. Ajuste a altura dos suportes e deite-se com os olhos alinhados à barra.\n2. Posicione os pés firmemente no chão e trave as escápulas no banco.\n3. Faça a pegada um pouco mais larga que os ombros.\n4. Tire a barra do suporte com os braços estendidos.\n5. Inspire e desça a barra até tocar suavemente o peito.\n6. Empurre a barra expirando o ar até a extensão quase completa dos cotovelos.",
    "setup": "Banco reto plano, suporte de barra ajustado na altura dos punhos com braços estendidos e presilhas de segurança.",
    "breathing": "Inspirar controladamente durante a descida e expirar durante o esforço máximo de subida.",
    "mistakes": "Não perder a retração escapular, não abrir cotovelos a 90 graus (manter cerca de 75 graus) e não rebater a barra no esterno.",
    "safetyNotes": "Em cargas elevadas, sempre utilize as barras de proteção (safety pins) ou solicite auxílio de um parceiro (spotter).",
    "movementPattern": "push_horizontal",
    "primaryMuscles": [
      "peitoral maior"
    ],
    "secondaryMuscles": [
      "tríceps",
      "deltoide anterior"
    ],
    "equipment": [
      "barbell",
      "bench"
    ],
    "experienceLevel": "intermediate",
    "defaultRestMin": 90,
    "defaultRestMax": 120,
    "estimatedSetDuration": 45,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Supino reto com barra no banco plano com execução biomecânica guiada.",
    "aliases": [
      "supino reto",
      "bench press",
      "supino com barra"
    ],
    "alternatives": [
      {
        "criteria": "Sem barra ou suporte disponível.",
        "exerciseId": "dumbbell-bench-press",
        "label": "Supino reto com halteres",
        "privateReasonCodes": [
          "equipment_unavailable"
        ],
        "publicReason": "Mesmo padrão de movimento com maior liberdade para a articulação dos ombros."
      },
      {
        "criteria": "Preferência por máquina ou foco em isolamento sem estabilização livre.",
        "exerciseId": "machine-chest-press",
        "label": "Supino reto na máquina",
        "privateReasonCodes": [
          "equipment_preference"
        ],
        "publicReason": "Trajetória fixa que garante segurança e controle biomecânico contínuo."
      }
    ],
    "adaptations": [
      {
        "id": "bench-press-reduced-range",
        "label": "Amplitude adaptada",
        "operationalResult": "Descer até 2 dedos antes do peito para preservar a cápsula articular do ombro.",
        "privateReasonCodes": [
          "range_of_motion_limit"
        ],
        "publicNote": "Versão adaptada para conforto articular.",
        "requiresReview": false
      }
    ],
    "progressions": [
      {
        "criteria": "Execução de 3x12 com controle total e RIR 2.",
        "exerciseId": "barbell-bench-press",
        "label": "Supino com pausa de 2 segundos no peito",
        "privateReasonCodes": [
          "progression_ready"
        ],
        "publicReason": "Elimina a energia elástica muscular aumentando a força no ponto de estagnação."
      }
    ],
    "regressions": [
      {
        "criteria": "Desconforto na articulação glenoumeral ou instabilidade.",
        "exerciseId": "dumbbell-bench-press",
        "label": "Supino com halteres pegada neutra",
        "privateReasonCodes": [
          "joint_comfort"
        ],
        "publicReason": "Posição neutra das mãos reduz o estresse mecânico no manguito rotador."
      }
    ],
    "source": {
      "name": "WillTreino Standards",
      "note": "Padrão de ouro biomecânico.",
      "url": "https://willtreino.app/exercises/barbell-bench-press"
    },
    "thumbnail": "https://i.ytimg.com/vi/rT7DgCr-3pg/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 45,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/rT7DgCr-3pg/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/rT7DgCr-3pg"
    },
    "captions": []
  },
  {
    "id": "dumbbell-bench-press",
    "name": "Supino reto com halteres",
    "slug": "supino-reto-halteres",
    "description": "Supino com halteres que proporciona maior arco de movimento, ativação simétrica dos membros e menor estresse nos ombros.",
    "execution": "Deitar no banco plano segurando os halteres ao nível do peito e empurrar verticalmente aproximando no topo sem bater os pesos.",
    "instructions": "1. Sente-se na ponta do banco com os halteres apoiados sobre os joelhos.\n2. Deite-se impulsionando os joelhos para levar os pesos até o peito.\n3. Firme os pés no chão e contraia o abdômen.\n4. Empurre os halteres para cima mantendo os antebraços sempre perpendiculares ao solo.\n5. Desça controladamente abrindo o peito até sentir bom alongamento.",
    "setup": "Banco reto e par de halteres proporcionais à carga de trabalho.",
    "breathing": "Inspire durante a descida e solte o ar na metade final da subida.",
    "mistakes": "Bater os halteres no topo, perder a estabilidade dos punhos e descer os cotovelos muito abaixo da linha dos ombros.",
    "safetyNotes": "Ao finalizar a série, leve os halteres de volta às coxas antes de sentar-se.",
    "movementPattern": "push_horizontal",
    "primaryMuscles": [
      "peitoral maior"
    ],
    "secondaryMuscles": [
      "deltoide anterior",
      "tríceps"
    ],
    "equipment": [
      "dumbbell",
      "bench"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Supino reto com halteres em banco plano para força e simetria.",
    "aliases": [
      "supino halter",
      "dumbbell press",
      "supino com halteres"
    ],
    "alternatives": [
      {
        "criteria": "Sem halteres suficientes.",
        "exerciseId": "barbell-bench-press",
        "label": "Supino reto com barra",
        "privateReasonCodes": [
          "equipment_unavailable"
        ],
        "publicReason": "Mesmo padrão motor com facilidade de progressão fracionada."
      }
    ],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": "https://willtreino.app/exercises/dumbbell-bench-press"
    },
    "thumbnail": "https://i.ytimg.com/vi/VmB1G1K7v94/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 40,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/VmB1G1K7v94/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/VmB1G1K7v94"
    },
    "captions": []
  },
  {
    "id": "machine-chest-press",
    "name": "Supino máquina sentado",
    "slug": "supino-maquina-sentado",
    "description": "Supino horizontal articulado em máquina para hipertrofia com estabilidade total e isolamento peitoral.",
    "execution": "Sentar ereto com peito estufado, empurrar as manoplas até quase estender os cotovelos e retornar alongando a musculatura.",
    "instructions": "1. Ajuste a altura do banco para que as manoplas fiquem na linha média do peito.\n2. Apoie as costas e cabeça firmemente no encosto.\n3. Empurre expirando até a extensão quase completa dos cotovelos.\n4. Retorne controlando o peso sem deixar as placas baterem.",
    "setup": "Ajuste do banco e seleção de pinos da coluna de peso.",
    "breathing": "Inspirar no retorno do peso e expirar no empurrão.",
    "mistakes": "Projetar os ombros para frente no final do movimento e deixar os ombros elevados.",
    "safetyNotes": "Mantenha o peito sempre aberto e escápulas aduzidas contra o encosto.",
    "movementPattern": "push_horizontal",
    "primaryMuscles": [
      "peitoral maior"
    ],
    "secondaryMuscles": [
      "tríceps",
      "deltoide anterior"
    ],
    "equipment": [
      "machine"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Supino sentado em máquina articulada com carga selecionável.",
    "aliases": [
      "chest press",
      "supino maquina"
    ],
    "alternatives": [
      {
        "criteria": "Máquina ocupada.",
        "exerciseId": "dumbbell-bench-press",
        "label": "Supino reto com halteres",
        "privateReasonCodes": [
          "equipment_unavailable"
        ],
        "publicReason": "Mesmo plano de movimento com pesos livres."
      }
    ],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": "https://willtreino.app/exercises/machine-chest-press"
    },
    "thumbnail": "https://i.ytimg.com/vi/sqOw2Y68ecg/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 35,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/sqOw2Y68ecg/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/sqOw2Y68ecg"
    },
    "captions": []
  },
  {
    "id": "incline-dumbbell-press",
    "name": "Supino inclinado com halteres",
    "slug": "supino-inclinado-halteres",
    "description": "Desenvolvimento do feixe clavicular (porção superior) do peitoral maior com banco inclinado a 30-45 graus.",
    "execution": "Deitar no banco inclinado e empurrar os halteres em trajetória convergente controlando o retorno.",
    "instructions": "1. Ajuste a inclinação do banco para 30 a 45 graus.\n2. Sente-se e apoie os halteres nos joelhos.\n3. Deite-se posicionando os pesos na altura do peitoral superior.\n4. Empurre para cima expirando e desça abrindo os cotovelos a 70 graus.",
    "setup": "Banco inclinado regulado entre 30 e 45 graus e par de halteres.",
    "breathing": "Inspirar descendo e soltar o ar empurrando.",
    "mistakes": "Inclinação muito alta (acima de 45 graus transfere a carga para os deltoides) e arquear a lombar tirando o glúteo do banco.",
    "safetyNotes": "Mantenha a lombar firme e a pelve neutra no banco.",
    "movementPattern": "push_horizontal",
    "primaryMuscles": [
      "peitoral maior"
    ],
    "secondaryMuscles": [
      "deltoide anterior",
      "tríceps"
    ],
    "equipment": [
      "dumbbell",
      "bench"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Supino inclinado com halteres para foco na porção superior do tórax.",
    "aliases": [
      "supino inclinado",
      "incline press"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/8iPEnn-ltC8/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 35,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/8iPEnn-ltC8/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/8iPEnn-ltC8"
    },
    "captions": []
  },
  {
    "id": "bodyweight-squat",
    "name": "Agachamento livre",
    "slug": "agachamento-livre",
    "description": "Padrão motor fundamental de agachamento com o peso do corpo para desenvolvimento dos membros inferiores e mobilidade de quadril.",
    "execution": "Flexionar quadril e joelhos simultaneamente mantendo os calcanhares no chão e coluna neutra até as coxas ficarem paralelas ao chão.",
    "instructions": "1. Posicione os pés na largura dos ombros com as pontas levemente apontadas para fora.\n2. Mantenha os braços à frente para equilibrar.\n3. Inicie o movimento projetando o quadril para trás e dobrando os joelhos.\n4. Desça com controle até o paralelo.\n5. Suba empurrando o chão com toda a sola do pé.",
    "setup": "Superfície estável e antiderrapante.",
    "breathing": "Inspirar antes de descer, travar o core e soltar o ar na subida.",
    "mistakes": "Tirar os calcanhares do chão ou deixar os joelhos colapsarem para dentro (valgo dinâmico).",
    "safetyNotes": "Mantenha o peito aberto e não olhe para o chão durante o movimento.",
    "movementPattern": "squat",
    "primaryMuscles": [
      "quadríceps",
      "glúteo máximo"
    ],
    "secondaryMuscles": [
      "isquiotibiais",
      "core"
    ],
    "equipment": [
      "bodyweight",
      "mat"
    ],
    "experienceLevel": "beginner",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 35,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Agachamento com peso corporal mantendo calcanhares no chão e tronco alinhado.",
    "aliases": [
      "air squat",
      "agachamento peso do corpo"
    ],
    "alternatives": [
      {
        "criteria": "Necessidade de referência física de altura.",
        "exerciseId": "bodyweight-squat",
        "label": "Agachamento na caixa (Box Squat)",
        "privateReasonCodes": [
          "balance_support"
        ],
        "publicReason": "Usa um banco como referência segura de profundidade e equilíbrio."
      }
    ],
    "adaptations": [],
    "progressions": [
      {
        "criteria": "Capaz de executar 3x15 com controle exemplar.",
        "exerciseId": "goblet-squat",
        "label": "Agachamento Goblet com halter",
        "privateReasonCodes": [
          "progression_ready"
        ],
        "publicReason": "Introdução de sobrecarga anterior mantendo excelente postura dorsal."
      }
    ],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/aclHkVaku9U/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 30,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/aclHkVaku9U/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/aclHkVaku9U"
    },
    "captions": []
  },
  {
    "id": "barbell-back-squat",
    "name": "Agachamento com barra",
    "slug": "agachamento-barra",
    "description": "Exercício de ouro para força máxima e hipertrofia global de membros inferiores e core.",
    "execution": "Barra apoiada sobre o trapézio, agachar controlando o vetor vertical até a profundidade segura e subir com explosão firme.",
    "instructions": "1. Entre sob a barra com pegada firme e posicione-a confortável no trapézio.\n2. Tire a barra do rack, dê dois passos para trás e alinhe os pés.\n3. Encha o abdômen de ar (manobra de Valsalva).\n4. Agache mantendo os joelhos alinhados com a ponta dos pés.\n5. Suba empurrando o chão e finalize a extensão do quadril no topo.",
    "setup": "Rack de agachamento com barras de segurança travadas na altura correta.",
    "breathing": "Inspiração profunda no topo, manter pressão intra-abdominal na descida e soltar o ar passando da metade da subida.",
    "mistakes": "Inclinar o tronco excessivamente à frente e curvar a coluna lombar na parte mais profunda.",
    "safetyNotes": "Nunca treine até a falha absoluta sem as barras laterais de proteção ajustadas.",
    "movementPattern": "squat",
    "primaryMuscles": [
      "quadríceps",
      "glúteo máximo"
    ],
    "secondaryMuscles": [
      "isquiotibiais",
      "eretores da espinha",
      "core"
    ],
    "equipment": [
      "barbell"
    ],
    "experienceLevel": "intermediate",
    "defaultRestMin": 90,
    "defaultRestMax": 150,
    "estimatedSetDuration": 45,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Agachamento clássico com barra nas costas em rack.",
    "aliases": [
      "squat",
      "agachamento livre com barra"
    ],
    "alternatives": [
      {
        "criteria": "Desconforto na coluna ou falta de rack livre.",
        "exerciseId": "leg-press-45",
        "label": "Leg Press 45°",
        "privateReasonCodes": [
          "lumbar_comfort"
        ],
        "publicReason": "Permite treinar quadríceps com suporte total para a coluna dorsal e lombar."
      }
    ],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/bEv6CCg2BC8/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 45,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/bEv6CCg2BC8/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/bEv6CCg2BC8"
    },
    "captions": []
  },
  {
    "id": "leg-press-45",
    "name": "Leg Press 45°",
    "slug": "leg-press-45",
    "description": "Padrão de flexão e extensão de pernas com suporte lombar e sobrecarga segura em plano inclinado.",
    "execution": "Posicionar os pés na plataforma na largura do quadril, destravar as travas laterais e descer até 90 graus de joelho, subindo sem hiperestender.",
    "instructions": "1. Sente-se no aparelho com o quadril totalmente colado no encosto.\n2. Posicione os pés na plataforma na largura dos ombros.\n3. Empurre para destravar a máquina com as mãos nas travas.\n4. Desça de forma suave até os joelhos formarem ângulo de 90 graus sem tirar o glúteo do banco.\n5. Empurre estendendo as pernas sem travar as articulações no topo.",
    "setup": "Ajuste de inclinação do encosto e carga em anilhas na plataforma.",
    "breathing": "Inspirar na descida e soltar o ar na força de subida.",
    "mistakes": "Tirar o quadril do banco no ponto mais baixo (retroversão pélvica) e estalar os joelhos no topo com hiperflexão.",
    "safetyNotes": "Mantenha as mãos sempre próximas às alavancas de segurança do aparelho.",
    "movementPattern": "squat",
    "primaryMuscles": [
      "quadríceps",
      "glúteo máximo"
    ],
    "secondaryMuscles": [
      "isquiotibiais"
    ],
    "equipment": [
      "plate_loaded_machine",
      "machine"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Leg press 45 graus para membros inferiores com encosto anatômico.",
    "aliases": [
      "leg 45",
      "leg press"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/IZxyjW7MPJQ/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 35,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/IZxyjW7MPJQ/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/IZxyjW7MPJQ"
    },
    "captions": []
  },
  {
    "id": "leg-extension-machine",
    "name": "Cadeira extensora",
    "slug": "cadeira-extensora",
    "description": "Isolamento articular monoarticular para retificação e hipertrofia de todas as cabeças do quadríceps.",
    "execution": "Sentar ajustando o rolo nos tornozelos, estender os joelhos completamente com breve contração no ápice e descer controlando.",
    "instructions": "1. Ajuste o encosto de modo que o eixo do aparelho fique alinhado ao joelho.\n2. O rolo de apoio deve ficar sobre o dorso do pé/tornozelo.\n3. Segure firme nas alças laterais para prender o quadril.\n4. Estenda os joelhos até a contração máxima do quadríceps.\n5. Segure 1 segundo no topo e retorne devagar.",
    "setup": "Ajuste do encosto traseiro e da altura do rolo inferior.",
    "breathing": "Soltar o ar na subida e inspirar na descida.",
    "mistakes": "Tirar o quadril do banco durante a subida ou deixar o peso descer despencando.",
    "safetyNotes": "Mantenha o tronco firme contra o estofado durante toda a repetição.",
    "movementPattern": "isolation_lower",
    "primaryMuscles": [
      "quadríceps"
    ],
    "secondaryMuscles": [],
    "equipment": [
      "machine"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 45,
    "defaultRestMax": 75,
    "estimatedSetDuration": 35,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Extensão de pernas na cadeira extensora para fortalecimento de quadríceps.",
    "aliases": [
      "cadeira extensora",
      "extensora",
      "leg extension"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/YyvSfV1184g/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 30,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/YyvSfV1184g/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/YyvSfV1184g"
    },
    "captions": []
  },
  {
    "id": "one-arm-dumbbell-row",
    "name": "Remada unilateral com halter",
    "slug": "remada-unilateral-halter",
    "description": "Padrão de puxar horizontal unilateral com estabilização em banco plano, ideal para espessura das costas e ativação do latíssimo.",
    "execution": "Apoiar joelho e mão no banco, manter a coluna alinhada ao chão e puxar o halter em direção à cintura puxando pelo cotovelo.",
    "instructions": "1. Coloque o joelho e a mão do mesmo lado sobre o banco plano.\n2. Mantenha o outro pé firme no chão.\n3. Segure o halter com o braço estendido.\n4. Puxe o peso trazendo o cotovelo para cima e para trás até a altura do tronco.\n5. Desça alongando as costas sem curvar a espinha.",
    "setup": "Banco plano e halter.",
    "breathing": "Inspirar na descida do peso e soltar o ar na tração para cima.",
    "mistakes": "Girar o tronco usando impulso do corpo ou puxar o peso na direção do peito em vez do quadril.",
    "safetyNotes": "Mantenha o abdômen travado e a coluna horizontal neutra.",
    "movementPattern": "pull_horizontal",
    "primaryMuscles": [
      "latíssimo do dorso"
    ],
    "secondaryMuscles": [
      "romboides",
      "bíceps",
      "deltoide posterior"
    ],
    "equipment": [
      "dumbbell",
      "bench"
    ],
    "experienceLevel": "intermediate",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Remada unilateral com halter apoiado em banco para costas.",
    "aliases": [
      "remada serrote",
      "dumbbell row",
      "serrote unilateral"
    ],
    "alternatives": [
      {
        "criteria": "Sem halteres ou desconforto lombar.",
        "exerciseId": "seated-cable-row",
        "label": "Remada baixa no cabo sentado",
        "privateReasonCodes": [
          "lumbar_comfort"
        ],
        "publicReason": "Apoio para os pés e tração guiada com tensão constante."
      }
    ],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/roCP6wCXPqo/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 35,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/roCP6wCXPqo/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/roCP6wCXPqo"
    },
    "captions": []
  },
  {
    "id": "seated-cable-row",
    "name": "Remada baixa no cabo sentado",
    "slug": "remada-baixa-cabo-sentado",
    "description": "Exercício de puxar horizontal na polia com triângulo ou barra, excelente para espessura dorsal e romboides.",
    "execution": "Sentar ereto com pés nas plataformas e puxar o pegador até o abdômen aproximando as escápulas.",
    "instructions": "1. Sente-se e apoie os pés nas plataformas com joelhos levemente flexionados.\n2. Segure o triângulo e retorne a coluna para posição vertical ereta.\n3. Puxe em direção ao umbigo jogando os ombros e escápulas para trás.\n4. Estenda os braços controlando o retorno sem curvar excessivamente o tronco à frente.",
    "setup": "Polia baixa com triângulo ou barra reta.",
    "breathing": "Soltar o ar puxando e inspirar no retorno.",
    "mistakes": "Balançar o tronco para frente e para trás para ganhar impulso.",
    "safetyNotes": "Mantenha a lombar sempre selada e protegida.",
    "movementPattern": "pull_horizontal",
    "primaryMuscles": [
      "latíssimo do dorso",
      "romboides"
    ],
    "secondaryMuscles": [
      "bíceps",
      "trapézio médio"
    ],
    "equipment": [
      "cable",
      "machine"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Remada sentada com cabo para espessura das costas.",
    "aliases": [
      "remada sentada",
      "remada baixa",
      "cable row"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/GZbfZ033f74/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 30,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/GZbfZ033f74/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/GZbfZ033f74"
    },
    "captions": []
  },
  {
    "id": "lat-pulldown",
    "name": "Puxada alta na polia",
    "slug": "puxada-alta-polia",
    "description": "Exercício clássico de puxar vertical para expansão de largura das costas (asa dorsal) e desenvolvimento de força escapular.",
    "execution": "Sentar ajustando as coxas, segurar a barra aberta e puxar verticalmente até a altura do peitoral superior com peito estufado.",
    "instructions": "1. Ajuste os rolos de suporte das coxas com firmeza.\n2. Segure a barra longa com pegada pronada na largura das curvas.\n3. Sente-se com o tronco levemente inclinado para trás (10 graus).\n4. Puxe a barra em direção ao queixo/peito superior conduzindo pelos cotovelos.\n5. Retorne os braços esticando totalmente os dorsais.",
    "setup": "Aparelho de puxada com barra longa anatômica.",
    "breathing": "Soltar o ar ao puxar e inspirar durante a subida controlada da barra.",
    "mistakes": "Puxar a barra por trás da nuca ou deitar excessivamente o tronco usando o peso corporal.",
    "safetyNotes": "Mantenha os ombros longe das orelhas antes de iniciar a puxada.",
    "movementPattern": "pull_vertical",
    "primaryMuscles": [
      "latíssimo do dorso"
    ],
    "secondaryMuscles": [
      "bíceps",
      "braquial",
      "deltoide posterior"
    ],
    "equipment": [
      "cable",
      "machine"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Puxador alto no cabo para amplitude das dorsais.",
    "aliases": [
      "puxada frente",
      "lat pulldown",
      "puxador costas"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/CAwf7n6Luuc/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 35,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/CAwf7n6Luuc/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/CAwf7n6Luuc"
    },
    "captions": []
  },
  {
    "id": "dumbbell-overhead-press",
    "name": "Desenvolvimento com halteres",
    "slug": "desenvolvimento-halteres",
    "description": "Exercício de empurrar vertical essencial para hipertrofia, força e arredondamento estético dos deltoides.",
    "execution": "Sentar no banco inclinado a 80 graus, erguer os halteres até a linha dos ombros e empurrar verticalmente acima da cabeça.",
    "instructions": "1. Ajuste o banco em ângulo quase reto (80-85 graus).\n2. Sente-se com as costas coladas e halteres na altura das orelhas.\n3. Cotovelos levemente à frente no plano escapular (não 100% abertos).\n4. Empurre os halteres para o alto aproximando-os no topo sem encostar.\n5. Desça com controle até a altura do queixo/orelhas.",
    "setup": "Banco regulável e par de halteres.",
    "breathing": "Inspirar na descida e expirar durante o empurrão vertical.",
    "mistakes": "Arquear a coluna lombar afastando as costas do banco e empurrar com cotovelos muito para trás.",
    "safetyNotes": "Mantenha o core sempre contraído e os punhos alinhados sobre os antebraços.",
    "movementPattern": "push_vertical",
    "primaryMuscles": [
      "deltoide anterior",
      "deltoide lateral"
    ],
    "secondaryMuscles": [
      "tríceps",
      "trapézio superior"
    ],
    "equipment": [
      "dumbbell",
      "bench"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Desenvolvimento com halteres sentado para deltoides.",
    "aliases": [
      "shoulder press",
      "desenvolvimento ombros",
      "press de ombro"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/qEwKCR5JCog/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 35,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/qEwKCR5JCog/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/qEwKCR5JCog"
    },
    "captions": []
  },
  {
    "id": "lateral-raise-dumbbell",
    "name": "Elevação lateral com halteres",
    "slug": "elevacao-lateral-halteres",
    "description": "Exercício de isolamento fundamental para largura e definição do feixe medial (lateral) do deltoide.",
    "execution": "Em pé com tronco levemente inclinado, elevar os halteres lateralmente até a altura dos ombros mantendo cotovelos firmes.",
    "instructions": "1. Em pé com pés afastados, segure um halter em cada mão à frente das coxas.\n2. Incline levemente o tronco à frente (5 graus) e dobre sutilmente os cotovelos.\n3. Eleve os braços lateralmente até que fiquem na linha dos ombros.\n4. Segure um breve instante no topo e desça com freio excêntrico.",
    "setup": "Par de halteres de carga leve a moderada.",
    "breathing": "Soltar o ar na subida e puxar o ar na descida lenta.",
    "mistakes": "Usar balanço do quadril (roubar) e elevar os pesos acima da linha dos ombros ativando o trapézio.",
    "safetyNotes": "Mantenha o polegar levemente apontado para baixo ou neutro para evitar pinçamento no ombro.",
    "movementPattern": "isolation_upper",
    "primaryMuscles": [
      "deltoide lateral"
    ],
    "secondaryMuscles": [
      "trapézio superior"
    ],
    "equipment": [
      "dumbbell"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 45,
    "defaultRestMax": 75,
    "estimatedSetDuration": 35,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Elevação lateral com halteres para porção medial dos ombros.",
    "aliases": [
      "elevacao lateral",
      "lateral raise"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/3VcKaXpzqRo/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 30,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/3VcKaXpzqRo/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/3VcKaXpzqRo"
    },
    "captions": []
  },
  {
    "id": "romanian-deadlift",
    "name": "Stiff com halteres (RDL)",
    "slug": "stiff-halteres-rdl",
    "description": "Padrão motor de dobradiça de quadril (hinge) com foco em glúteos, posteriores de coxa e estabilidade postural eretora.",
    "execution": "Empurrar o quadril para trás com joelhos semiflexionados descendo os halteres rentes às pernas até o meio da tíbia e retornar contraindo glúteos.",
    "instructions": "1. Fique em pé com os halteres na frente das coxas.\n2. Mantenha os joelhos destravados (leve flexão mantida fixa).\n3. Jogue o quadril para trás como se quisesse tocar uma parede com o bumbum.\n4. Desça até sentir o alongamento pleno dos posteriores de coxa.\n5. Volte impulsionando o quadril para a frente e contraia os glúteos no topo.",
    "setup": "Par de halteres e espaço livre.",
    "breathing": "Inspirar descendo com a coluna selada e soltar o ar ao subir.",
    "mistakes": "Arredondar a coluna lombar (coluna em C) ou flexionar os joelhos transformando em agachamento.",
    "safetyNotes": "Mantenha os pesos colados ao corpo durante toda a trajetória.",
    "movementPattern": "hinge",
    "primaryMuscles": [
      "isquiotibiais",
      "glúteo máximo"
    ],
    "secondaryMuscles": [
      "eretores da espinha",
      "antebraço"
    ],
    "equipment": [
      "dumbbell"
    ],
    "experienceLevel": "intermediate",
    "defaultRestMin": 60,
    "defaultRestMax": 90,
    "estimatedSetDuration": 40,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Levantamento terra romeno com halteres para cadeia posterior.",
    "aliases": [
      "stiff",
      "rdl",
      "romanian deadlift"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/JCXUYuzwNrM/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 35,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/JCXUYuzwNrM/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/JCXUYuzwNrM"
    },
    "captions": []
  },
  {
    "id": "lying-leg-curl",
    "name": "Mesa flexora",
    "slug": "mesa-flexora",
    "description": "Isolamento mecânico direto dos isquiotibiais (posterior da coxa) em posição deitada.",
    "execution": "Deitar de bruços no aparelho com o rolo acima do calcanhar, flexionar os joelhos até contração total e descer controladamente.",
    "instructions": "1. Deite-se no aparelho com os joelhos alinhados com o eixo de rotação da máquina.\n2. Posicione o rolo almofadado atrás dos tornozelos.\n3. Segure firme nos apoios para manter a pelve pressionada contra o banco.\n4. Puxe os calcanhares em direção aos glúteos o máximo que conseguir.\n5. Retorne estendendo as pernas de forma suave.",
    "setup": "Ajuste do rolo dos tornozelos e peso nas placas.",
    "breathing": "Soltar o ar na flexão e puxar o ar no retorno do peso.",
    "mistakes": "Tirar a bacia e quadril do banco durante a puxada forte e despencar o peso.",
    "safetyNotes": "Mantenha o abdômen firme para não forçar a coluna lombar.",
    "movementPattern": "isolation_lower",
    "primaryMuscles": [
      "isquiotibiais"
    ],
    "secondaryMuscles": [
      "gastrocnêmio"
    ],
    "equipment": [
      "machine"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 45,
    "defaultRestMax": 75,
    "estimatedSetDuration": 35,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Mesa flexora para isolamento dos músculos posteriores da coxa.",
    "aliases": [
      "mesa flexora",
      "flexora deitada",
      "leg curl"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/1Tq3QdYUuHs/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 30,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/1Tq3QdYUuHs/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/1Tq3QdYUuHs"
    },
    "captions": []
  },
  {
    "id": "dumbbell-bicep-curl",
    "name": "Rosca direta com halteres",
    "slug": "rosca-direta-halteres",
    "description": "Exercício de isolamento clássico para hipertrofia dos bíceps braquial e braquiorradial com rotação supinada.",
    "execution": "Em pé com cotovelos colados ao tronco, flexionar os braços girando os punhos para cima e descer com controle total.",
    "instructions": "1. Em pé com postura ereta, segure os halteres ao lado do corpo.\n2. Inicie a flexão girando a palma da mão para cima (supinação).\n3. Contraia o bíceps com força no topo sem levantar os cotovelos.\n4. Desça de forma lenta sentindo a extensão controlada do braço.",
    "setup": "Par de halteres adequados.",
    "breathing": "Expirar ao subir o halter e inspirar na descida.",
    "mistakes": "Balançar o corpo para trás gerando embalo e projetar os cotovelos à frente.",
    "safetyNotes": "Mantenha os cotovelos sempre fixos ao lado das costelas.",
    "movementPattern": "isolation_upper",
    "primaryMuscles": [
      "bíceps"
    ],
    "secondaryMuscles": [
      "braquiorradial",
      "antebraço"
    ],
    "equipment": [
      "dumbbell"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 45,
    "defaultRestMax": 75,
    "estimatedSetDuration": 35,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Rosca com halteres alternada ou simultânea para bíceps.",
    "aliases": [
      "rosca direta",
      "bicep curl",
      "rosca com halteres"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/ykJmrZ5v0Oo/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 30,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/ykJmrZ5v0Oo/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/ykJmrZ5v0Oo"
    },
    "captions": []
  },
  {
    "id": "tricep-rope-pushdown",
    "name": "Tríceps corda na polia",
    "slug": "triceps-corda-polia",
    "description": "Excelente ativação de todas as cabeças do tríceps, permitindo abertura lateral no final para contração em pico.",
    "execution": "Segurar a corda na polia alta com cotovelos fixos, empurrar para baixo até extensão completa abrindo as mãos no fim.",
    "instructions": "1. Prenda a corda na polia alta.\n2. Segure nas extremidades com os polegares voltados para cima.\n3. Trave os cotovelos junto ao tronco com leve inclinação à frente.\n4. Empurre para baixo até estender os braços, abrindo as pontas da corda.\n5. Retorne de forma lenta até o ângulo de 90 graus nos cotovelos.",
    "setup": "Polia alta com acessório corda.",
    "breathing": "Soltar o ar ao empurrar e inspirar ao subir.",
    "mistakes": "Deixar os cotovelos subirem junto com a corda ou afastar os cotovelos do tronco.",
    "safetyNotes": "Mantenha o peito aberto e estabilize os ombros.",
    "movementPattern": "isolation_upper",
    "primaryMuscles": [
      "tríceps"
    ],
    "secondaryMuscles": [
      "antebraço"
    ],
    "equipment": [
      "cable"
    ],
    "experienceLevel": "all_levels",
    "defaultRestMin": 45,
    "defaultRestMax": 75,
    "estimatedSetDuration": 35,
    "attribution": "WillTreino Content Standards",
    "license": "CC BY 4.0",
    "accessibleDescription": "Extensão de tríceps na polia alta com acessório corda.",
    "aliases": [
      "triceps corda",
      "triceps polia",
      "rope pushdown"
    ],
    "alternatives": [],
    "adaptations": [],
    "progressions": [],
    "regressions": [],
    "source": {
      "name": "WillTreino Standards",
      "note": null,
      "url": null
    },
    "thumbnail": "https://i.ytimg.com/vi/vB5OHsJ3EME/hqdefault.jpg",
    "video": {
      "aspectRatio": "16:9",
      "autoplayAllowed": false,
      "durationSeconds": 30,
      "mutedDefault": true,
      "posterUrl": "https://i.ytimg.com/vi/vB5OHsJ3EME/hqdefault.jpg",
      "src": "https://www.youtube-nocookie.com/embed/vB5OHsJ3EME"
    },
    "captions": []
  }
] as const;

export const seedExercises: Exercise[] = seedExerciseRecords.map((exercise) =>
  exerciseSchema.parse(exercise),
);

export function getSeedExerciseById(id: string): Exercise | null {
  return seedExercises.find((exercise) => exercise.id === id) ?? null;
}
