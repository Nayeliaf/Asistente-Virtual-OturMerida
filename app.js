/* =========================================================
   OTURMÉRIDA · ASISTENTE VIRTUAL
   APP.JS
   Prototipo HTML + CSS + JS
   Sin backend
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const STORAGE_KEY = "oturmerida_demo_v4";

const CONFIG = {
    agencyName: "OturMérida",

    paymentMethods: [
        {
            id: "transferencia",
            label: "Transferencia / Pago Móvil",
            description: "Pago en bolívares"
        },
        {
            id: "zelle",
            label: "Zelle",
            description: "Pago en dólares"
        },
        {
            id: "efectivo",
            label: "Efectivo $",
            description: "Dólares en efectivo"
        }
    ],

    venezuelaStates: [
        "Amazonas",
        "Anzoátegui",
        "Apure",
        "Aragua",
        "Barinas",
        "Bolívar",
        "Carabobo",
        "Cojedes",
        "Delta Amacuro",
        "Distrito Capital",
        "Falcón",
        "Guárico",
        "La Guaira",
        "Lara",
        "Mérida",
        "Miranda",
        "Monagas",
        "Nueva Esparta",
        "Portuguesa",
        "Sucre",
        "Táchira",
        "Trujillo",
        "Yaracuy",
        "Zulia"
    ],

    instagramDestinations: [
        {
            name: "Los Roques",
            scope: "Nacional",
            type: "Paquete",
            description:
                "Información recibida desde Instagram para consultar un viaje a Los Roques."
        }
    ]
};

/* =========================================================
   DOM
   ========================================================= */

const clientChat = document.getElementById("client-chat");
const clientQuick = document.getElementById("client-quick");
const clientForm = document.getElementById("client-form");
const clientInput = document.getElementById("client-input");
const clientStatus = document.getElementById("client-status");

const adminStats = document.getElementById("admin-stats");
const adminList = document.getElementById("admin-list");
const adminDetail = document.getElementById("admin-detail");
const adminFilter = document.getElementById("admin-filter");
const resetDemoButton = document.getElementById("reset-demo");

/* =========================================================
   ESTADO
   ========================================================= */

let state = loadState();

if (!state.conversations || !Array.isArray(state.conversations)) {
    state = createInitialState();
}

if (!state.activeConversationId) {
    const conversation = createConversation();
    state.conversations.push(conversation);
    state.activeConversationId = conversation.id;
}

saveState();

/* =========================================================
   EVENTOS
   ========================================================= */

clientForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const text = clientInput.value.trim();

    if (!text) {
        return;
    }

    clientInput.value = "";

    handleClientMessage(text);
});

clientQuick.addEventListener("click", function (event) {
    const button = event.target.closest("button");

    if (!button) {
        return;
    }

    const value = button.dataset.value || button.textContent.trim();

    handleQuickReply(value);
});

adminFilter.addEventListener("input", function () {
    renderAdminList();
});

resetDemoButton.addEventListener("click", function () {
    const confirmed = window.confirm(
        "¿Quieres reiniciar la demostración? Se eliminará la información almacenada en este navegador."
    );

    if (!confirmed) {
        return;
    }

    localStorage.removeItem(STORAGE_KEY);

    state = createInitialState();

    const conversation = createConversation();

    state.conversations.push(conversation);
    state.activeConversationId = conversation.id;

    saveState();
    renderEverything();
});

/* =========================================================
   ESTADO INICIAL
   ========================================================= */

function createInitialState() {
    return {
        conversations: [],
        activeConversationId: null
    };
}

function createConversation() {
    return {
        id: "conv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        botEnabled: true,

        status: "AUTOMATIZACIÓN ACTIVA",

        greeted: false,

        stage: "WAITING_FIRST_MESSAGE",

        pendingField: null,

        profile: {
            name: "",
            lastname: "",
            phone: "",
            email: "",
            document: "",
            documentType: "",
            address: ""
        },

        memory: {
            previousRequests: []
        },

        request: {
            id: null,

            scope: "",

            origin: "",
            destination: "",

            modality: "",

            departureDate: "",
            returnDate: "",

            adults: null,
            children: null,
            childrenAges: [],

            residenceAddress: "",
            destinationAddress: "",

            paymentMethod: "",

            source: ""
        },

        messages: []
    };
}

/* =========================================================
   PERSISTENCIA
   ========================================================= */

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return createInitialState();
        }

        const parsed = JSON.parse(raw);

        return normalizeState(parsed);
    } catch (error) {
        console.error("Error cargando estado:", error);

        return createInitialState();
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("No se pudo guardar el estado:", error);
    }
}

function normalizeState(savedState) {
    if (!savedState || typeof savedState !== "object") {
        return createInitialState();
    }

    if (!Array.isArray(savedState.conversations)) {
        savedState.conversations = [];
    }

    savedState.conversations = savedState.conversations.map(function (conversation) {
        const base = createConversation();

        return {
            ...base,
            ...conversation,

            profile: {
                ...base.profile,
                ...(conversation.profile || {})
            },

            memory: {
                ...base.memory,
                ...(conversation.memory || {})
            },

            request: {
                ...base.request,
                ...(conversation.request || {})
            },

            messages: Array.isArray(conversation.messages)
                ? conversation.messages
                : []
        };
    });

    return savedState;
}

/* =========================================================
   CONVERSACIÓN ACTIVA
   ========================================================= */

function getActiveConversation() {
    return state.conversations.find(function (conversation) {
        return conversation.id === state.activeConversationId;
    });
}

function touchConversation(conversation) {
    conversation.updatedAt = new Date().toISOString();
}

function getOrCreateActiveConversation() {
    let conversation = getActiveConversation();

    if (!conversation) {
        conversation = createConversation();

        state.conversations.push(conversation);
        state.activeConversationId = conversation.id;
    }

    return conversation;
}

/* =========================================================
   MENSAJES
   ========================================================= */

function addMessage(conversation, sender, text) {
    conversation.messages.push({
        id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),

        sender: sender,

        text: String(text),

        timestamp: new Date().toISOString()
    });

    touchConversation(conversation);

    saveState();

    renderEverything();
}

function botMessage(text) {
    const conversation = getActiveConversation();

    if (!conversation) {
        return;
    }

    addMessage(conversation, "bot", text);
}

function humanMessage(text) {
    const conversation = getActiveConversation();

    if (!conversation) {
        return;
    }

    addMessage(conversation, "human", text);
}

function userMessage(text) {
    const conversation = getActiveConversation();

    if (!conversation) {
        return;
    }

    addMessage(conversation, "user", text);
}

/* =========================================================
   ENTRADA PRINCIPAL
   ========================================================= */

function handleClientMessage(text) {

    const conversation = getOrCreateActiveConversation();

    /*
     * =====================================================
     * FIREWALL DE INTENCIÓN
     * =====================================================
     */

    const originalText = String(text || "").trim();

    /*
     * Normalización independiente para que el firewall
     * funcione aunque el usuario escriba con o sin acentos.
     */
    const firewallText = originalText
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[¿?¡!.,;:()[\]"']/g, " ")
        .replace(/\s+/g, " ")
        .trim();


    /*
     * -----------------------------------------------------
     * 1. PALABRAS QUE INDICAN UNA SOLICITUD COMERCIAL
     * -----------------------------------------------------
     */

    const commercialWords = [
        "viaje",
        "viajes",
        "viajar",
        "cotizar",
        "cotizacion",
        "precio",
        "precios",
        "pasaje",
        "pasajes",
        "boleto",
        "boletos",
        "vuelo",
        "vuelos",
        "hotel",
        "hoteles",
        "reserva",
        "reservar",
        "paquete",
        "paquetes",
        "destino",
        "aeropuerto",
        "aeropuertos",
        "turismo",
        "ida",
        "vuelta",
        "ida y vuelta",
        "disponibilidad",
        "tarifa",
        "tarifas",
        "equipaje",
        "maleta",
        "maletas",
        "pasaporte",
        "cedula",
        "pago",
        "zelle",
        "transferencia"
    ];

    const hasCommercialIntent =
        commercialWords.some(function (word) {
            return firewallText.includes(word);
        });


    /*
     * -----------------------------------------------------
     * 2. FRASES CLARAMENTE PERSONALES
     * -----------------------------------------------------
     */

    const personalPhrases = [
        "como estas",
        "como esta",
        "que haces",
        "donde estas",
        "cuando nos vemos",
        "nos vemos",
        "te extrano",
        "te quiero",
        "te amo",
        "mi amor",
        "mi vida",
        "carino",
        "cariño",
        "amor",
        "novia",
        "novio",
        "esposa",
        "esposo",
        "mi hermano",
        "mi hermana",
        "mi primo",
        "mi prima",
        "mi mama",
        "mi papa",
        "feliz cumpleanos",
        "feliz cumpleaños",
        "feliz navidad",
        "te llamo",
        "llamame",
        "llamame cuando",
        "escribeme",
        "escribeme cuando",
        "hablamos despues",
        "hablamos despues"
    ];

    const hasPersonalPhrase =
        personalPhrases.some(function (phrase) {
            return firewallText.includes(
                phrase
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
            );
        });


    /*
     * -----------------------------------------------------
     * 3. MENSAJES DIRIGIDOS AL PROPIETARIO
     * -----------------------------------------------------
     */

    const mentionsOwner =
        firewallText.includes("alfredo");


    /*
     * -----------------------------------------------------
     * 4. MENSAJES SOCIALES NORMALES
     *
     * "Hola", "Buenas", "Gracias", etc. NO son personales.
     * El bot debe seguir funcionando normalmente.
     * -----------------------------------------------------
     */

    const socialMessages = [
        "hola",
        "buenas",
        "buenas tardes",
        "buenas noches",
        "buenos dias",
        "saludos",
        "gracias",
        "muchas gracias",
        "mil gracias"
    ];

    const isSocialMessage =
        socialMessages.includes(firewallText);


    /*
     * -----------------------------------------------------
     * 5. DECISIÓN DEL FIREWALL
     * -----------------------------------------------------
     */

    let firewallResult = "UNKNOWN";


    /*
     * Una solicitud comercial SIEMPRE tiene prioridad.
     *
     * Ejemplo:
     *
     * "Hola Alfredo, quiero cotizar un viaje"
     *
     * NO se bloquea.
     */

    if (hasCommercialIntent) {

        firewallResult = "COMMERCIAL";

    }

    /*
     * Si es una frase claramente personal, la detenemos.
     */

    else if (hasPersonalPhrase) {

        firewallResult = "PERSONAL";

    }

    /*
     * Una mención al propietario + lenguaje personal
     * también se considera personal.
     */

    else if (
        mentionsOwner &&
        (
            firewallText.includes("hola") ||
            firewallText.includes("buenas") ||
            firewallText.includes("como") ||
            firewallText.includes("que haces")
        )
    ) {

        firewallResult = "PERSONAL";

    }

    /*
     * Saludos normales pasan.
     */

    else if (isSocialMessage) {

        firewallResult = "SOCIAL";

    }


    /*
     * -----------------------------------------------------
     * 6. SI ES PERSONAL
     * -----------------------------------------------------
     */

    if (firewallResult === "PERSONAL") {

        /*
         * Primero guardamos el mensaje del cliente.
         */
        userMessage(originalText);

        /*
         * Respondemos sin intentar interpretar el mensaje
         * como nombre, destino, fecha, teléfono, etc.
         */
        botMessage(
            "¡Hola! 👋 Este número está destinado a la atención de OturMérida.\n\n" +
            "Si deseas cotizar un viaje, consultar precios, " +
            "reservar o recibir información sobre nuestros servicios, " +
            "con gusto puedo ayudarte."
        );

        /*
         * Volvemos al menú comercial.
         */
        showMainMenu(conversation);

        return;
    }


    /*
     * =====================================================
     * FIN DEL FIREWALL
     * ===================================================== */


    /*
     * A partir de aquí continúa EXACTAMENTE el flujo
     * comercial que ya tenía tu aplicación.
     */

    userMessage(originalText);

    /* Si Alfredo tomó la conversación, el bot no interviene. */
    if (!conversation.botEnabled) {
        return;
    }

    /* Si estaba cerrada, una nueva interacción abre una nueva solicitud. */
    if (conversation.status === "CONVERSACIÓN CONCLUIDA") {
        startNewRequest(conversation);
    }

    /* Primera interacción */
    if (
        conversation.stage === "WAITING_FIRST_MESSAGE" ||
        !conversation.greeted
    ) {
        conversation.greeted = true;

        saveState();

        showMainMenu(conversation);

        return;
    }

    /* Extraer información evidente aunque venga mezclada */
    extractGeneralInformation(
        conversation,
        originalText
    );

    processStage(
        conversation,
        originalText
    );

    saveState();

    renderEverything();
}
/* =========================================================
   MENÚ PRINCIPAL
   ========================================================= */

function showMainMenu(conversation) {
    conversation.stage = "MAIN_MENU";
    conversation.pendingField = null;

    botMessage(
        "¡Hola! 👋 Soy el asistente virtual de OturMérida y te ayudaré a recopilar la información necesaria para preparar tu cotización.\n\n¿En qué te podemos ayudar el día de hoy?"
    );

    setQuickButtons([
        {
            label: "✈️ Cotizar un viaje nuevo",
            value: "COTIZAR_NUEVO"
        },
        {
            label: "📲 Vengo por Instagram",
            value: "INSTAGRAM"
        },
        {
            label: "👨‍💼 Hablar con el encargado",
            value: "HABLAR_ENCARGADO"
        }
    ]);
}

function handleQuickReply(value) {
    const conversation = getActiveConversation();

    if (!conversation) {
        return;
    }

    /* Mostrar la selección como mensaje del cliente */
    const labels = {
        COTIZAR_NUEVO: "✈️ Cotizar un viaje nuevo",
        INSTAGRAM: "📲 Vengo por Instagram",
        HABLAR_ENCARGADO: "👨‍💼 Hablar con el encargado"
    };

    if (labels[value]) {
        userMessage(labels[value]);
    }

    if (!conversation.botEnabled) {
        return;
    }

    if (value === "COTIZAR_NUEVO") {
        startNewRequest(conversation);

        botMessage(
            "Perfecto. ✈️ Vamos a recopilar tus datos paso a paso para preparar la solicitud de cotización."
        );

        askName(conversation);

        return;
    }

    if (value === "INSTAGRAM") {
        startNewRequest(conversation);

        conversation.request.source = "Instagram";

        const destination = CONFIG.instagramDestinations[0];

        conversation.request.destination = destination.name;
        conversation.request.scope = destination.scope;

        botMessage(
            "¡Excelente! 📲 Hemos recibido tu interés desde Instagram por " +
            destination.name +
            ".\n\nVoy a recopilar los datos necesarios para que el encargado pueda revisar tu solicitud."
        );

        askName(conversation);

        return;
    }

    if (value === "HABLAR_ENCARGADO") {
        activateHumanHandoff(conversation);

        return;
    }

    /* Botones de los distintos pasos */
    processQuickValue(conversation, value);
}

/* =========================================================
   NUEVA SOLICITUD
   ========================================================= */

function startNewRequest(conversation) {
    /* Guardar solicitud anterior en memoria si existía información */
    if (
        conversation.request &&
        (
            conversation.request.destination ||
            conversation.request.origin ||
            conversation.request.departureDate
        )
    ) {
        conversation.memory.previousRequests =
            conversation.memory.previousRequests || [];

        conversation.memory.previousRequests.push({
            ...conversation.request,
            closedAt: new Date().toISOString()
        });
    }

    conversation.request = {
        id:
            "REQ-" +
            new Date().getFullYear() +
            "-" +
            Math.floor(1000 + Math.random() * 9000),

        scope: "",

        origin: "",
        destination: "",

        modality: "",

        departureDate: "",
        returnDate: "",

        adults: null,
        children: null,
        childrenAges: [],

        residenceAddress: "",
        destinationAddress: "",

        paymentMethod: "",

        source: ""
    };

    conversation.stage = "QUOTE_NAME";
    conversation.pendingField = "name";

    conversation.botEnabled = true;
    conversation.status = "AUTOMATIZACIÓN ACTIVA";

    touchConversation(conversation);
    saveState();
}

/* =========================================================
   FLUJO DE CAMPOS
   ========================================================= */

function askName(conversation) {
    conversation.stage = "QUOTE_NAME";
    conversation.pendingField = "name";

    botMessage(
        conversation.profile.name
            ? "Tengo registrado tu nombre como " +
                  conversation.profile.name +
                  ". Si quieres actualizarlo, escríbeme tu nombre y apellido."
            : "Para comenzar, ¿cuál es tu nombre y apellido?"
    );

    clearQuickButtons();
}

function askPhone(conversation) {
    conversation.stage = "QUOTE_PHONE";
    conversation.pendingField = "phone";

    if (conversation.profile.phone) {
        botMessage(
            "Tengo registrado este número: " +
                conversation.profile.phone +
                ". Si deseas utilizar otro, escríbelo."
        );
    } else {
        botMessage("¿Cuál es tu número de teléfono?");
    }

    clearQuickButtons();
}

function askEmail(conversation) {
    conversation.stage = "QUOTE_EMAIL";
    conversation.pendingField = "email";

    if (conversation.profile.email) {
        botMessage(
            "Tengo registrado este correo: " +
                conversation.profile.email +
                ". Si deseas utilizar otro, escríbelo."
        );
    } else {
        botMessage("¿Cuál es tu correo electrónico?");
    }

    clearQuickButtons();
}

function askScope(conversation) {
    conversation.stage = "QUOTE_SCOPE";
    conversation.pendingField = "scope";

    botMessage("¿El viaje es nacional o internacional?");

    setQuickButtons([
        {
            label: "🇻🇪 Nacional",
            value: "Nacional"
        },
        {
            label: "🌎 Internacional",
            value: "Internacional"
        }
    ]);
}

function askOrigin(conversation) {
    conversation.stage = "QUOTE_ORIGIN";
    conversation.pendingField = "origin";

    if (conversation.request.scope === "Nacional") {
        botMessage("¿Desde qué estado de Venezuela deseas salir?");

        setQuickButtons(
            CONFIG.venezuelaStates.map(function (stateName) {
                return {
                    label: stateName,
                    value: stateName
                };
            })
        );

        return;
    }

    botMessage("¿Desde qué ciudad o país deseas iniciar el viaje?");

    clearQuickButtons();
}

function askDestination(conversation) {
    conversation.stage = "QUOTE_DESTINATION";
    conversation.pendingField = "destination";

    if (conversation.request.destination) {
        botMessage(
            "El destino que tenemos registrado es " +
                conversation.request.destination +
                ".\n\nSi deseas cambiarlo, escríbeme el nuevo destino."
        );

        clearQuickButtons();

        return;
    }

    if (conversation.request.scope === "Nacional") {
        botMessage("¿Cuál es tu destino dentro de Venezuela?");

        setQuickButtons(
            CONFIG.venezuelaStates.map(function (stateName) {
                return {
                    label: stateName,
                    value: stateName
                };
            })
        );

        return;
    }

    botMessage("¿Cuál es el destino internacional?");

    clearQuickButtons();
}

function askModality(conversation) {
    conversation.stage = "QUOTE_MODALITY";
    conversation.pendingField = "modality";

    botMessage("¿Necesitas solo ida, solo vuelta o ida y vuelta?");

    setQuickButtons([
        {
            label: "Solo ida",
            value: "Solo ida"
        },
        {
            label: "Solo vuelta",
            value: "Solo vuelta"
        },
        {
            label: "Ida y vuelta",
            value: "Ida y vuelta"
        }
    ]);
}

function askDepartureDate(conversation) {
    conversation.stage = "QUOTE_DEPARTURE_DATE";
    conversation.pendingField = "departureDate";

    botMessage(
        "¿Cuál es la fecha de ida?\n\nPuedes escribirla, por ejemplo: 10 de septiembre, 10/09/2026 o 10-09-2026."
    );

    clearQuickButtons();
}

function askReturnDate(conversation) {
    conversation.stage = "QUOTE_RETURN_DATE";
    conversation.pendingField = "returnDate";

    botMessage(
        "¿Cuál es la fecha de vuelta?\n\nPuedes escribirla, por ejemplo: 15 de septiembre, 15/09/2026 o 15-09-2026."
    );

    clearQuickButtons();
}

function askPassengers(conversation) {
    conversation.stage = "QUOTE_PASSENGERS";
    conversation.pendingField = "passengers";

    botMessage(
        "¿Cuántas personas viajarán?\n\nPuedes escribirlo de forma natural, por ejemplo: “somos 2 adultos y 1 niño de 8 años”."
    );

    clearQuickButtons();
}

function askChildrenAges(conversation) {
    conversation.stage = "QUOTE_CHILD_AGES";
    conversation.pendingField = "childrenAges";

    botMessage(
        "¿Qué edades tienen los niños?\n\nPor ejemplo: 7 y 10 años."
    );

    clearQuickButtons();
}

function askInternationalAddresses(conversation) {
    conversation.stage = "QUOTE_RESIDENCE_ADDRESS";
    conversation.pendingField = "residenceAddress";

    botMessage("¿Cuál es tu dirección de residencia?");

    clearQuickButtons();
}

function askDestinationAddress(conversation) {
    conversation.stage = "QUOTE_DESTINATION_ADDRESS";
    conversation.pendingField = "destinationAddress";

    botMessage("¿Cuál será la dirección de destino o alojamiento?");

    clearQuickButtons();
}

function askDocument(conversation) {
    conversation.stage = "QUOTE_DOCUMENT";
    conversation.pendingField = "document";

    if (conversation.request.scope === "Nacional") {
        conversation.profile.documentType = "Cédula de Identidad";

        botMessage("¿Cuál es tu número de Cédula de Identidad?");
    } else {
        conversation.profile.documentType = "Pasaporte";

        botMessage("¿Cuál es tu número de pasaporte?");
    }

    clearQuickButtons();
}

function askPayment(conversation) {
    conversation.stage = "QUOTE_PAYMENT";
    conversation.pendingField = "paymentMethod";

    botMessage("¿Qué método de pago utilizarías?");

    setQuickButtons(
        CONFIG.paymentMethods.map(function (method) {
            return {
                label: method.label,
                value: method.label
            };
        })
    );
}

/* =========================================================
   PROCESAMIENTO SEGÚN ETAPA
   ========================================================= */

function processStage(conversation, text) {
    switch (conversation.stage) {
        case "MAIN_MENU":
            processMainMenuText(conversation, text);
            break;

        case "QUOTE_NAME":
            processName(conversation, text);
            break;

        case "QUOTE_PHONE":
            processPhone(conversation, text);
            break;

        case "QUOTE_EMAIL":
            processEmail(conversation, text);
            break;

        case "QUOTE_SCOPE":
            processScope(conversation, text);
            break;

        case "QUOTE_ORIGIN":
            processOrigin(conversation, text);
            break;

        case "QUOTE_DESTINATION":
            processDestination(conversation, text);
            break;

        case "QUOTE_MODALITY":
            processModality(conversation, text);
            break;

        case "QUOTE_DEPARTURE_DATE":
            processDepartureDate(conversation, text);
            break;

        case "QUOTE_RETURN_DATE":
            processReturnDate(conversation, text);
            break;

        case "QUOTE_PASSENGERS":
            processPassengers(conversation, text);
            break;

        case "QUOTE_CHILD_AGES":
            processChildrenAges(conversation, text);
            break;

        case "QUOTE_RESIDENCE_ADDRESS":
            processResidenceAddress(conversation, text);
            break;

        case "QUOTE_DESTINATION_ADDRESS":
            processDestinationAddress(conversation, text);
            break;

        case "QUOTE_DOCUMENT":
            processDocument(conversation, text);
            break;

        case "QUOTE_PAYMENT":
            processPayment(conversation, text);
            break;

        case "READY_FOR_ADVISOR":
            processReadyStage(conversation, text);
            break;

        default:
            showMainMenu(conversation);
            break;
    }
}

/* =========================================================
   MENÚ POR TEXTO
   ========================================================= */

function processMainMenuText(conversation, text) {
    const normalized = normalize(text);

    if (
        normalized.includes("cotizar") ||
        normalized.includes("viaje nuevo") ||
        normalized.includes("nuevo viaje")
    ) {
        startNewRequest(conversation);

        botMessage(
            "Perfecto. ✈️ Vamos a recopilar los datos necesarios para preparar tu solicitud."
        );

        askName(conversation);

        return;
    }

    if (
        normalized.includes("instagram") ||
        normalized.includes("instagram")
    ) {
        startNewRequest(conversation);

        conversation.request.source = "Instagram";

        const destination = CONFIG.instagramDestinations[0];

        conversation.request.destination = destination.name;
        conversation.request.scope = destination.scope;

        botMessage(
            "¡Excelente! 📲 Hemos recibido tu interés desde Instagram por " +
                destination.name +
                "."
        );

        askName(conversation);

        return;
    }

    if (
        normalized.includes("encargado") ||
        normalized.includes("asesor") ||
        normalized.includes("persona") ||
        normalized.includes("humano")
    ) {
        activateHumanHandoff(conversation);

        return;
    }

    botMessage(
        "Selecciona una de las opciones disponibles para continuar:"
    );

    setQuickButtons([
        {
            label: "✈️ Cotizar un viaje nuevo",
            value: "COTIZAR_NUEVO"
        },
        {
            label: "📲 Vengo por Instagram",
            value: "INSTAGRAM"
        },
        {
            label: "👨‍💼 Hablar con el encargado",
            value: "HABLAR_ENCARGADO"
        }
    ]);
}

/* =========================================================
   NOMBRE
   ========================================================= */

function processName(conversation, text) {
    const cleaned = cleanPersonName(text);

    if (!cleaned) {
        botMessage("Indícame tu nombre y apellido, por favor.");

        return;
    }

    const parts = cleaned.split(/\s+/);

    if (parts.length < 2) {
        conversation.profile.name = parts[0];

        botMessage(
            "Perfecto. ¿Cuál es tu apellido?"
        );

        conversation.stage = "QUOTE_NAME";
        conversation.pendingField = "name";

        return;
    }

    conversation.profile.name = parts[0];
    conversation.profile.lastname = parts.slice(1).join(" ");

    botMessage(
        "Gracias, " +
            conversation.profile.name +
            " " +
            conversation.profile.lastname +
            "."
    );

    askPhone(conversation);
}

/* =========================================================
   TELÉFONO
   ========================================================= */

function processPhone(conversation, text) {
    const digits = text.replace(/\D/g, "");

    if (digits.length < 7) {
        botMessage(
            "Necesito un número de teléfono válido. Puedes escribirlo con o sin código internacional."
        );

        return;
    }

    conversation.profile.phone = text.trim();

    botMessage("Perfecto. 📱");

    askEmail(conversation);
}

/* =========================================================
   CORREO
   ========================================================= */

function processEmail(conversation, text) {
    const emailMatch = text.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

    if (!emailMatch) {
        botMessage(
            "No pude identificar el correo. Escríbelo, por ejemplo: nombre@correo.com"
        );

        return;
    }

    conversation.profile.email = emailMatch[0];

    botMessage("Correo registrado correctamente. 📧");

    /*
     * Si ya conocemos Nacional/Internacional por Instagram,
     * no lo volvemos a preguntar.
     */
    if (conversation.request.scope) {
        askOrigin(conversation);
    } else {
        askScope(conversation);
    }
}

/* =========================================================
   ÁMBITO
   ========================================================= */

function processScope(conversation, text) {
    const normalized = normalize(text);

    /*
     * IMPORTANTE:
     * "internacional" contiene la palabra "nacional",
     * por eso debemos comprobar INTERNACIONAL primero.
     */

    if (
        normalized === "internacional" ||
        normalized.includes("internacional") ||
        normalized.includes("fuera del pais") ||
        normalized.includes("otro pais")
    ) {
        conversation.request.scope = "Internacional";
    }

    else if (
        normalized === "nacional" ||
        normalized.includes("nacional") ||
        normalized.includes("venezuela")
    ) {
        conversation.request.scope = "Nacional";
    }

    else {
        botMessage(
            "Indícame si el viaje es Nacional o Internacional."
        );

        setQuickButtons([
            {
                label: "🇻🇪 Nacional",
                value: "Nacional"
            },
            {
                label: "🌎 Internacional",
                value: "Internacional"
            }
        ]);

        return;
    }

    /*
     * Continuar con el origen.
     *
     * Nacional:
     *   botones con estados de Venezuela.
     *
     * Internacional:
     *   campo escrito manualmente.
     */
    askOrigin(conversation);
}

function processOrigin(conversation, text) {
    const value = cleanLocation(text);

    if (!value) {
        botMessage(
            "Indícame la ciudad, estado o país desde donde deseas salir."
        );

        return;
    }

    conversation.request.origin = value;

    botMessage("Origen registrado: " + value + ". 📍");

    askDestination(conversation);
}

/* =========================================================
   DESTINO
   ========================================================= */

function processDestination(conversation, text) {
    const value = cleanLocation(text);

    if (!value) {
        botMessage(
            "Indícame el destino al que deseas viajar."
        );

        return;
    }

    conversation.request.destination = value;

    botMessage("Destino registrado: " + value + ". ✈️");

    askModality(conversation);
}

/* =========================================================
   MODALIDAD
   ========================================================= */

function processModality(conversation, text) {
    const modality = parseModality(text);

    if (!modality) {
        botMessage(
            "Selecciona una opción: solo ida, solo vuelta o ida y vuelta."
        );

        setQuickButtons([
            {
                label: "Solo ida",
                value: "Solo ida"
            },
            {
                label: "Solo vuelta",
                value: "Solo vuelta"
            },
            {
                label: "Ida y vuelta",
                value: "Ida y vuelta"
            }
        ]);

        return;
    }

    conversation.request.modality = modality;

    /*
     * Intentamos capturar fechas que vengan en el mismo mensaje.
     */
    const range = parseDateRange(text);

    if (range) {
        if (range.departure) {
            conversation.request.departureDate = range.departure;
        }

        if (range.returnDate) {
            conversation.request.returnDate = range.returnDate;
        }
    }

    if (modality === "Solo ida") {
        conversation.request.returnDate = "";

        if (conversation.request.departureDate) {
            askPassengers(conversation);
        } else {
            askDepartureDate(conversation);
        }

        return;
    }

    if (modality === "Solo vuelta") {
        conversation.request.departureDate = "";

        if (conversation.request.returnDate) {
            askPassengers(conversation);
        } else {
            askReturnDate(conversation);
        }

        return;
    }

    /* Ida y vuelta */
    if (
        conversation.request.departureDate &&
        conversation.request.returnDate
    ) {
        askPassengers(conversation);

        return;
    }

    if (!conversation.request.departureDate) {
        askDepartureDate(conversation);

        return;
    }

    askReturnDate(conversation);
}

/* =========================================================
   FECHA DE IDA
   ========================================================= */

function processDepartureDate(conversation, text) {
    const range = parseDateRange(text);

    if (range && range.departure) {
        conversation.request.departureDate = range.departure;

        if (
            conversation.request.modality === "Ida y vuelta" &&
            range.returnDate
        ) {
            conversation.request.returnDate = range.returnDate;

            botMessage(
                "He registrado:\n📅 Ida: " +
                    conversation.request.departureDate +
                    "\n📅 Vuelta: " +
                    conversation.request.returnDate
            );

            askPassengers(conversation);

            return;
        }

        botMessage(
            "Fecha de ida registrada: " +
                conversation.request.departureDate +
                "."
        );

        if (conversation.request.modality === "Ida y vuelta") {
            askReturnDate(conversation);
        } else {
            askPassengers(conversation);
        }

        return;
    }

    botMessage(
        "Necesito el día exacto. Puedes escribirlo, por ejemplo: 10 de septiembre de 2026."
    );
}

/* =========================================================
   FECHA DE VUELTA
   ========================================================= */

function processReturnDate(conversation, text) {
    const range = parseDateRange(text);

    let returnDate = "";

    if (range && range.returnDate) {
        returnDate = range.returnDate;
    } else if (range && range.departure) {
        returnDate = range.departure;
    }

    if (!returnDate) {
        botMessage(
            "Necesito el día exacto de vuelta. Por ejemplo: 15 de septiembre de 2026."
        );

        return;
    }

    conversation.request.returnDate = returnDate;

    botMessage(
        "Fecha de vuelta registrada: " +
            returnDate +
            "."
    );

    askPassengers(conversation);
}

/* =========================================================
   PASAJEROS
   ========================================================= */

function processPassengers(conversation, text) {
    const result = parsePassengers(text);

    if (!result) {
        botMessage(
            "Indícame cuántas personas viajan. Por ejemplo: “2 adultos y 1 niño de 8 años”."
        );

        return;
    }

    conversation.request.adults = result.adults;
    conversation.request.children = result.children;

    if (result.ages.length > 0) {
        conversation.request.childrenAges = result.ages;
    }

    if (
        conversation.request.children > 0 &&
        conversation.request.childrenAges.length <
            conversation.request.children
    ) {
        askChildrenAges(conversation);

        return;
    }

    continueAfterPassengers(conversation);
}

function processChildrenAges(conversation, text) {
    const ages = parseAges(text);

    if (ages.length === 0) {
        botMessage(
            "Indícame las edades de los niños. Por ejemplo: 7 y 10 años."
        );

        return;
    }

    conversation.request.childrenAges = ages;

    continueAfterPassengers(conversation);
}

function continueAfterPassengers(conversation) {
    const countText = formatPassengers(conversation.request);

    botMessage(
        "Perfecto. 👥 " +
            countText
    );

    if (conversation.request.scope === "Internacional") {
        askInternationalAddresses(conversation);

        return;
    }

    askDocument(conversation);
}

/* =========================================================
   DIRECCIÓN DE RESIDENCIA
   ========================================================= */

function processResidenceAddress(conversation, text) {
    const value = text.trim();

    if (value.length < 5) {
        botMessage(
            "Indícame la dirección de residencia con un poco más de detalle."
        );

        return;
    }

    conversation.request.residenceAddress = value;

    botMessage("Dirección de residencia registrada. 📍");

    askDestinationAddress(conversation);
}

/* =========================================================
   DIRECCIÓN DE DESTINO
   ========================================================= */

function processDestinationAddress(conversation, text) {
    const value = text.trim();

    if (value.length < 3) {
        botMessage(
            "Indícame la dirección de destino o alojamiento."
        );

        return;
    }

    conversation.request.destinationAddress = value;

    botMessage("Dirección de destino registrada. 📍");

    askDocument(conversation);
}

/* =========================================================
   DOCUMENTO
   ========================================================= */

function processDocument(conversation, text) {
    const value = text.trim();

    if (value.length < 4) {
        botMessage(
            conversation.request.scope === "Nacional"
                ? "Indícame tu número de Cédula de Identidad."
                : "Indícame tu número de pasaporte."
        );

        return;
    }

    conversation.profile.document = value;

    botMessage(
        conversation.request.scope === "Nacional"
            ? "Cédula de Identidad registrada correctamente."
            : "Pasaporte registrado correctamente."
    );

    askPayment(conversation);
}

/* =========================================================
   PAGO
   ========================================================= */

function processPayment(conversation, text) {
    const value = text.trim();

    if (!value) {
        botMessage("Indícame el método de pago que utilizarías.");

        return;
    }

    conversation.request.paymentMethod = value;

    botMessage(
        "Método de pago registrado. 💳"
    );

    prepareSummary(conversation);
}

/* =========================================================
   RESUMEN
   ========================================================= */

function prepareSummary(conversation) {
    conversation.stage = "READY_FOR_ADVISOR";
    conversation.pendingField = null;
    conversation.status = "LISTO PARA ENCARGADO";

    const request = conversation.request;
    const profile = conversation.profile;

    let summary = "";

    summary += "Perfecto. He recopilado la información de tu solicitud. ✅\n\n";

    summary += "👤 Nombre: " +
        safeValue(profile.name + " " + profile.lastname) +
        "\n";

    summary += "📱 Teléfono: " +
        safeValue(profile.phone) +
        "\n";

    summary += "📧 Correo: " +
        safeValue(profile.email) +
        "\n";

    summary += "🌎 Tipo de viaje: " +
        safeValue(request.scope) +
        "\n";

    summary += "📍 Origen: " +
        safeValue(request.origin) +
        "\n";

    summary += "📍 Destino: " +
        safeValue(request.destination) +
        "\n";

    summary += "🔄 Modalidad: " +
        safeValue(request.modality) +
        "\n";

    summary += "📅 Fecha de ida: " +
        (
            request.departureDate
                ? request.departureDate
                : "No aplica"
        ) +
        "\n";

    summary += "📅 Fecha de vuelta: " +
        (
            request.returnDate
                ? request.returnDate
                : "No aplica"
        ) +
        "\n";

    summary += "👥 Pasajeros: " +
        formatPassengers(request) +
        "\n";

    if (request.scope === "Internacional") {
        summary += "🏠 Dirección de residencia: " +
            safeValue(request.residenceAddress) +
            "\n";

        summary += "📍 Dirección de destino: " +
            safeValue(request.destinationAddress) +
            "\n";

        summary += "🛂 Pasaporte: " +
            safeValue(profile.document) +
            "\n";
    } else {
        summary += "🪪 Cédula de Identidad: " +
            safeValue(profile.document) +
            "\n";
    }

    summary += "💳 Método de pago: " +
        safeValue(request.paymentMethod);

    botMessage(summary);

    botMessage(
        "La solicitud quedó estructurada para revisión del encargado. ℹ️\n\nOturMérida no genera precios ni confirma disponibilidad automáticamente; el encargado realizará la cotización correspondiente."
    );

    setQuickButtons([
        {
            label: "👨‍💼 Enviar al encargado",
            value: "ENVIAR_ENCARGADO"
        },
        {
            label: "✏️ Modificar información",
            value: "MODIFICAR"
        }
    ]);
}

/* =========================================================
   LISTO PARA ENCARGADO
   ========================================================= */

function processReadyStage(conversation, text) {
    const normalized = normalize(text);

    if (
        normalized.includes("modificar") ||
        normalized.includes("editar") ||
        normalized.includes("cambiar")
    ) {
        botMessage(
            "Claro. ¿Qué dato deseas modificar?"
        );

        setQuickButtons([
            {
                label: "Nombre",
                value: "EDIT_NAME"
            },
            {
                label: "Teléfono",
                value: "EDIT_PHONE"
            },
            {
                label: "Correo",
                value: "EDIT_EMAIL"
            },
            {
                label: "Origen",
                value: "EDIT_ORIGIN"
            },
            {
                label: "Destino",
                value: "EDIT_DESTINATION"
            },
            {
                label: "Fechas",
                value: "EDIT_DATES"
            }
        ]);

        return;
    }

    if (
        normalized.includes("encargado") ||
        normalized.includes("enviar") ||
        normalized.includes("asesor")
    ) {
        activateHumanHandoff(conversation);

        return;
    }

    botMessage(
        "Tu solicitud ya está preparada. Puedes enviarla al encargado o modificar algún dato."
    );

    setQuickButtons([
        {
            label: "👨‍💼 Enviar al encargado",
            value: "ENVIAR_ENCARGADO"
        },
        {
            label: "✏️ Modificar información",
            value: "MODIFICAR"
        }
    ]);
}

/* =========================================================
   BOTONES DE LOS CAMPOS
   ========================================================= */

function processQuickValue(conversation, value) {
    if (value === "ENVIAR_ENCARGADO") {
        activateHumanHandoff(conversation);

        return;
    }

    if (value === "MODIFICAR") {
        botMessage(
            "Claro. Selecciona el dato que deseas modificar:"
        );

        setQuickButtons([
            {
                label: "Nombre",
                value: "EDIT_NAME"
            },
            {
                label: "Teléfono",
                value: "EDIT_PHONE"
            },
            {
                label: "Correo",
                value: "EDIT_EMAIL"
            },
            {
                label: "Origen",
                value: "EDIT_ORIGIN"
            },
            {
                label: "Destino",
                value: "EDIT_DESTINATION"
            },
            {
                label: "Fechas",
                value: "EDIT_DATES"
            }
        ]);

        return;
    }

    if (value === "EDIT_NAME") {
        askName(conversation);
        return;
    }

    if (value === "EDIT_PHONE") {
        askPhone(conversation);
        return;
    }

    if (value === "EDIT_EMAIL") {
        askEmail(conversation);
        return;
    }

    if (value === "EDIT_ORIGIN") {
        askOrigin(conversation);
        return;
    }

    if (value === "EDIT_DESTINATION") {
        askDestination(conversation);
        return;
    }

    if (value === "EDIT_DATES") {
        askModality(conversation);
        return;
    }

    /*
     * Valores normales del formulario
     */
    if (conversation.stage === "QUOTE_SCOPE") {
        processScope(conversation, value);
        return;
    }

    if (conversation.stage === "QUOTE_ORIGIN") {
        processOrigin(conversation, value);
        return;
    }

    if (conversation.stage === "QUOTE_DESTINATION") {
        processDestination(conversation, value);
        return;
    }

    if (conversation.stage === "QUOTE_MODALITY") {
        processModality(conversation, value);
        return;
    }

    if (conversation.stage === "QUOTE_PAYMENT") {
        processPayment(conversation, value);
        return;
    }
}

/* =========================================================
   ATENCIÓN HUMANA
   ========================================================= */

function activateHumanHandoff(conversation) {
    conversation.botEnabled = false;

    conversation.status = "ATENCIÓN HUMANA";

    conversation.stage = "HUMAN_HANDOFF";
    conversation.pendingField = null;

    botMessage(
        "👨‍💼 Tu solicitud será atendida por el encargado de OturMérida.\n\nLa automatización queda pausada para esta conversación y el encargado podrá continuar contigo directamente."
    );

    clearQuickButtons();

    touchConversation(conversation);

    saveState();
}

/* =========================================================
   CONCLUIR CONVERSACIÓN
   ========================================================= */

function concludeConversation(conversation) {
    conversation.botEnabled = true;

    conversation.status = "CONVERSACIÓN CONCLUIDA";

    conversation.stage = "CONVERSATION_CLOSED";

    conversation.pendingField = null;

    /*
     * La solicitud permanece almacenada.
     * No se borra el historial ni la memoria.
     */

    addMessage(
        conversation,
        "human",
        "La atención humana ha sido concluida."
    );

    botMessage(
        "¡Gracias por confiar en OturMérida! ✈️\n\nEstamos para servirte. Cuando estés listo para viajar, aquí estaremos.\n\n¡Que tengas un excelente día! 😊"
    );

    clearQuickButtons();

    saveState();
}

/* =========================================================
   EXTRACCIÓN GENERAL
   ========================================================= */

function extractGeneralInformation(conversation, text) {
    const emailMatch = text.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

    if (
        emailMatch &&
        !conversation.profile.email
    ) {
        conversation.profile.email = emailMatch[0];
    }

    const phoneMatch = text.match(
        /(?:\+?\d[\d\s().-]{7,}\d)/
    );

    if (
        phoneMatch &&
        !conversation.profile.phone
    ) {
        conversation.profile.phone = phoneMatch[0].trim();
    }

    const modality = parseModality(text);

    if (
        modality &&
        !conversation.request.modality
    ) {
        conversation.request.modality = modality;
    }

    const range = parseDateRange(text);

    if (range) {
        if (
            range.departure &&
            !conversation.request.departureDate
        ) {
            conversation.request.departureDate = range.departure;
        }

        if (
            range.returnDate &&
            !conversation.request.returnDate
        ) {
            conversation.request.returnDate = range.returnDate;
        }
    }

    const passengers = parsePassengers(text);

    if (
        passengers &&
        conversation.stage !== "QUOTE_PASSENGERS"
    ) {
        if (
            conversation.request.adults === null &&
            passengers.adults !== null
        ) {
            conversation.request.adults = passengers.adults;
        }

        if (
            conversation.request.children === null &&
            passengers.children !== null
        ) {
            conversation.request.children = passengers.children;
        }

        if (
            passengers.ages.length > 0 &&
            conversation.request.childrenAges.length === 0
        ) {
            conversation.request.childrenAges = passengers.ages;
        }
    }
}

/* =========================================================
   PARSEO DE MODALIDAD
   ========================================================= */

function parseModality(text) {
    const normalized = normalize(text);

    if (
        normalized.includes("ida y vuelta") ||
        normalized.includes("ida vuelta") ||
        normalized.includes("ambas")
    ) {
        return "Ida y vuelta";
    }

    if (
        normalized.includes("solo ida") ||
        normalized === "ida" ||
        normalized.includes("solo de ida")
    ) {
        return "Solo ida";
    }

    if (
        normalized.includes("solo vuelta") ||
        normalized === "vuelta" ||
        normalized.includes("solo de vuelta")
    ) {
        return "Solo vuelta";
    }

    return "";
}

/* =========================================================
   PARSEO DE FECHAS
   ========================================================= */

function parseDateRange(text) {
    const normalizedText = text.toLowerCase().trim();

    /*
     * Primero intentamos detectar dos fechas explícitas.
     */

    const numericDates = [
        ...normalizedText.matchAll(
            /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/g
        )
    ];

    if (numericDates.length >= 2) {
        const first = convertNumericDate(
            numericDates[0][1],
            numericDates[0][2],
            numericDates[0][3]
        );

        const second = convertNumericDate(
            numericDates[1][1],
            numericDates[1][2],
            numericDates[1][3]
        );

        return {
            departure: first,
            returnDate: second
        };
    }

    /*
     * Fechas numéricas de una sola fecha.
     */

    if (numericDates.length === 1) {
        const one = numericDates[0];

        const date = convertNumericDate(
            one[1],
            one[2],
            one[3]
        );

        if (date) {
            return {
                departure: date,
                returnDate: ""
            };
        }
    }

    /*
     * Fechas con meses escritos.
     */

    const monthMap = {
        enero: 1,
        febrero: 2,
        marzo: 3,
        abril: 4,
        mayo: 5,
        junio: 6,
        julio: 7,
        agosto: 8,
        septiembre: 9,
        setiembre: 9,
        octubre: 10,
        noviembre: 11,
        diciembre: 12
    };

    const monthPattern =
        "(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)";

    const regex =
        new RegExp(
            "\\b(\\d{1,2})\\s*(?:de\\s*)?" +
                monthPattern +
                "(?:\\s*(?:de|del)\\s*(\\d{4}))?",
            "gi"
        );

    const matches = [];

    let match;

    while ((match = regex.exec(normalizedText)) !== null) {
        matches.push({
            day: Number(match[1]),
            month: monthMap[match[2].toLowerCase()],
            year: match[3]
                ? Number(match[3])
                : new Date().getFullYear()
        });
    }

    if (matches.length >= 2) {
        return {
            departure: formatDateObject(matches[0]),
            returnDate: formatDateObject(matches[1])
        };
    }

    if (matches.length === 1) {
        return {
            departure: formatDateObject(matches[0]),
            returnDate: ""
        };
    }

    /*
     * Si solo dice “en diciembre”, “a mediados de agosto”, etc.,
     * NO inventamos un día.
     */
    return null;
}

function convertNumericDate(day, month, year) {
    let finalYear = year
        ? Number(year)
        : new Date().getFullYear();

    if (finalYear < 100) {
        finalYear += 2000;
    }

    return formatDateObject({
        day: Number(day),
        month: Number(month),
        year: finalYear
    });
}

function formatDateObject(dateObject) {
    if (
        !dateObject ||
        !dateObject.day ||
        !dateObject.month
    ) {
        return "";
    }

    const day = String(dateObject.day).padStart(2, "0");
    const month = String(dateObject.month).padStart(2, "0");

    return day + "/" + month + "/" + dateObject.year;
}

/* =========================================================
   PARSEO DE PASAJEROS
   ========================================================= */

function parsePassengers(text) {
    const normalized = normalize(text);

    let adults = null;
    let children = null;

    /*
     * Adultos explícitos
     */

    const adultMatch = normalized.match(
        /(\d+)\s*(adultos?|adultas?)/i
    );

    if (adultMatch) {
        adults = Number(adultMatch[1]);
    }

    /*
     * Niños explícitos
     */

    const childMatch = normalized.match(
        /(\d+)\s*(niños?|ninas?|niñas?|menores?)/i
    );

    if (childMatch) {
        children = Number(childMatch[1]);
    }

    /*
     * Edades de niños
     */

    const ages = parseAges(text);

    if (
        children === null &&
        ages.length > 0
    ) {
        children = ages.length;
    }

    /*
     * "Somos 4"
     */

    if (
        adults === null &&
        children === null
    ) {
        const totalMatch = normalized.match(
            /\b(?:somos|viajamos|vamos|seremos)\s+(\d+)\b/
        );

        if (totalMatch) {
            adults = Number(totalMatch[1]);
            children = 0;
        }
    }

    /*
     * "4 personas"
     */

    if (
        adults === null &&
        children === null
    ) {
        const peopleMatch = normalized.match(
            /\b(\d+)\s*(personas?|pasajeros?)\b/
        );

        if (peopleMatch) {
            adults = Number(peopleMatch[1]);
            children = 0;
        }
    }

    /*
     * "tres adultos"
     */

    if (adults === null) {
        const words = {
            uno: 1,
            una: 1,
            dos: 2,
            tres: 3,
            cuatro: 4,
            cinco: 5,
            seis: 6,
            siete: 7,
            ocho: 8,
            nueve: 9,
            diez: 10
        };

        for (const word in words) {
            if (
                normalized.includes(
                    word + " adulto"
                )
            ) {
                adults = words[word];
                break;
            }
        }
    }

    /*
     * "mi esposa, mis dos hijos y yo"
     */

    if (
        adults === null &&
        children === null &&
        (
            normalized.includes("mi esposa") ||
            normalized.includes("mi esposo") ||
            normalized.includes("mis hijos") ||
            normalized.includes("y yo")
        )
    ) {
        let estimatedAdults = 1;

        if (
            normalized.includes("esposa") ||
            normalized.includes("esposo") ||
            normalized.includes("pareja")
        ) {
            estimatedAdults = 2;
        }

        adults = estimatedAdults;

        const childrenWordMatch = normalized.match(
            /mis\s+(\d+)\s+hijos?/
        );

        if (childrenWordMatch) {
            children = Number(childrenWordMatch[1]);
        }
    }

    if (
        adults === null &&
        children === null
    ) {
        return null;
    }

    if (adults === null) {
        adults = 0;
    }

    if (children === null) {
        children = 0;
    }

    return {
        adults: adults,
        children: children,
        ages: ages
    };
}

function parseAges(text) {
    const normalized = normalize(text);

    const ages = [];

    const matches = normalized.matchAll(
        /\b(\d{1,2})\s*(?:años?|anos?)\b/g
    );

    for (const match of matches) {
        const age = Number(match[1]);

        if (
            age >= 0 &&
            age <= 17
        ) {
            ages.push(age);
        }
    }

    return ages;
}

function formatPassengers(request) {
    const adults =
        request.adults === null ||
        request.adults === undefined
            ? 0
            : request.adults;

    const children =
        request.children === null ||
        request.children === undefined
            ? 0
            : request.children;

    let text = "";

    if (adults === 1) {
        text += "1 adulto";
    } else {
        text += adults + " adultos";
    }

    if (children > 0) {
        text +=
            children === 1
                ? " y 1 niño"
                : " y " + children + " niños";

        if (
            request.childrenAges &&
            request.childrenAges.length > 0
        ) {
            text +=
                " (" +
                request.childrenAges.join(", ") +
                " años)";
        }
    }

    return text;
}

/* =========================================================
   TEXTO / NORMALIZACIÓN
   ========================================================= */

function normalize(text) {
    return String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[¿?¡!.,;:()[\]{}]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanPersonName(text) {
    return String(text)
        .replace(/[0-9]/g, "")
        .replace(/[^\p{L}\s'-]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanLocation(text) {
    return String(text)
        .replace(/\s+/g, " ")
        .trim();
}

function safeValue(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "No indicado";
    }

    return String(value);
}

/* =========================================================
   BOTONES
   ========================================================= */

function setQuickButtons(buttons) {
    clientQuick.innerHTML = "";

    if (!buttons || buttons.length === 0) {
        return;
    }

    buttons.forEach(function (buttonData) {
        const button = document.createElement("button");

        button.type = "button";

        button.textContent = buttonData.label;

        button.dataset.value = buttonData.value;

        clientQuick.appendChild(button);
    });
}

function clearQuickButtons() {
    clientQuick.innerHTML = "";
}

/* =========================================================
   RENDER CLIENTE
   ========================================================= */

function renderClient() {
    const conversation = getActiveConversation();

    if (!conversation) {
        return;
    }

    clientChat.innerHTML = "";

    conversation.messages.forEach(function (message) {
        const element = document.createElement("div");

        element.className =
            "message " +
            (
                message.sender === "user"
                    ? "user"
                    : message.sender === "human"
                        ? "human"
                        : message.sender === "system"
                            ? "system"
                            : "bot"
            );

        const textElement = document.createElement("span");

        textElement.className = "message-text";

        textElement.textContent = message.text;

        const timeElement = document.createElement("span");

        timeElement.className = "message-time";

        timeElement.textContent =
            formatTime(message.timestamp);

        element.appendChild(textElement);
        element.appendChild(timeElement);

        clientChat.appendChild(element);
    });

    requestAnimationFrame(function () {
        clientChat.scrollTop = clientChat.scrollHeight;
    });

    renderClientStatus(conversation);
}

function renderClientStatus(conversation) {
    if (!clientStatus) {
        return;
    }

    if (conversation.status === "ATENCIÓN HUMANA") {
        clientStatus.textContent = "atención humana";

        return;
    }

    if (conversation.status === "LISTO PARA ENCARGADO") {
        clientStatus.textContent = "solicitud preparada";

        return;
    }

    if (conversation.status === "CONVERSACIÓN CONCLUIDA") {
        clientStatus.textContent = "conversación concluida";

        return;
    }

    clientStatus.textContent = "asistente virtual";
}

/* =========================================================
   RENDER ADMIN
   ========================================================= */

function renderAdminList() {
    const filter = normalize(
        adminFilter.value || ""
    );

    const conversations = [...state.conversations]
        .sort(function (a, b) {
            return (
                new Date(b.updatedAt) -
                new Date(a.updatedAt)
            );
        })
        .filter(function (conversation) {
            if (!filter) {
                return true;
            }

            const name =
                conversation.profile.name +
                " " +
                conversation.profile.lastname;

            const phone =
                conversation.profile.phone || "";

            const messages = conversation.messages
                .map(function (message) {
                    return message.text;
                })
                .join(" ");

            return normalize(
                name +
                " " +
                phone +
                " " +
                messages
            ).includes(filter);
        });

    adminList.innerHTML = "";

    if (conversations.length === 0) {
        const empty = document.createElement("div");

        empty.style.padding = "20px";
        empty.style.color = "#737b84";
        empty.style.fontSize = "12px";
        empty.textContent = "No hay conversaciones.";

        adminList.appendChild(empty);

        return;
    }

    conversations.forEach(function (conversation) {
        const item = document.createElement("div");

        item.className = "conversation-item";

        if (
            conversation.id ===
            state.activeConversationId
        ) {
            item.classList.add("active");
        }

        const top = document.createElement("div");

        top.className = "conversation-top";

        const name = document.createElement("div");

        name.className = "conversation-name";

        name.textContent =
            (
                conversation.profile.name +
                " " +
                conversation.profile.lastname
            ).trim() ||
            "Cliente sin identificar";

        const time = document.createElement("div");

        time.className = "conversation-time";

        time.textContent =
            formatTime(conversation.updatedAt);

        top.appendChild(name);
        top.appendChild(time);

        const preview = document.createElement("div");

        preview.className = "conversation-preview";

        const lastMessage =
            conversation.messages[
                conversation.messages.length - 1
            ];

        preview.textContent =
            lastMessage
                ? lastMessage.text
                : "Sin mensajes";

        const pill = document.createElement("div");

        pill.className =
            "status-pill " +
            getStatusClass(conversation.status);

        pill.textContent =
            conversation.status;

        item.appendChild(top);
        item.appendChild(preview);
        item.appendChild(pill);

        item.addEventListener("click", function () {
            state.activeConversationId =
                conversation.id;

            saveState();

            renderEverything();
        });

        adminList.appendChild(item);
    });
}

/* =========================================================
   DETALLE ADMIN
   ========================================================= */

function renderAdminDetail() {
    const conversation = getActiveConversation();

    if (!conversation) {
        adminDetail.innerHTML = `
            <div class="empty">
                <div class="empty-icon">💬</div>
                <h2>Selecciona una conversación</h2>
                <p>Aquí podrás consultar la información recopilada por el asistente y gestionar la atención del cliente.</p>
            </div>
        `;

        return;
    }

    const fullName =
        (
            conversation.profile.name +
            " " +
            conversation.profile.lastname
        ).trim() ||
        "Cliente sin identificar";

    const request = conversation.request;
    const profile = conversation.profile;

    let html = "";

    html += `
        <div class="detail-header">
            <div class="detail-title">
                <h2>${escapeHtml(fullName)}</h2>
                <p>${escapeHtml(
                    profile.phone ||
                    "Número no registrado"
                )}</p>
            </div>

            <div class="detail-actions">
    `;

    if (
        conversation.status === "ATENCIÓN HUMANA" ||
        conversation.status === "LISTO PARA ENCARGADO"
    ) {
        html += `
            <button
                class="action-button primary"
                type="button"
                data-admin-action="conclude"
            >
                Concluir conversación
            </button>
        `;
    }

    if (
        conversation.status === "CONVERSACIÓN CONCLUIDA"
    ) {
        html += `
            <button
                class="action-button"
                type="button"
                data-admin-action="new-request"
            >
                Nueva solicitud
            </button>
        `;
    }

    html += `
            </div>
        </div>
    `;

    html += `
        <div class="detail-status">
            <strong>Estado:</strong>
            <span>${escapeHtml(
                conversation.status
            )}</span>
        </div>
    `;

    /* Datos del cliente */

    html += `
        <section class="info-section">
            <h3>Datos del cliente</h3>

            <div class="info-grid">

                ${infoCard(
                    "Nombre",
                    fullName
                )}

                ${infoCard(
                    "Teléfono",
                    profile.phone
                )}

                ${infoCard(
                    "Correo electrónico",
                    profile.email
                )}

                ${infoCard(
                    request.scope === "Internacional"
                        ? "Pasaporte"
                        : "Cédula de Identidad",
                    profile.document
                )}

            </div>
        </section>
    `;

    /* Solicitud */

    html += `
        <section class="info-section">
            <h3>Datos del viaje</h3>

            <div class="info-grid">

                ${infoCard(
                    "Tipo de viaje",
                    request.scope
                )}

                ${infoCard(
                    "Origen",
                    request.origin
                )}

                ${infoCard(
                    "Destino",
                    request.destination
                )}

                ${infoCard(
                    "Modalidad",
                    request.modality
                )}

                ${infoCard(
                    "Fecha de ida",
                    request.departureDate ||
                    "No aplica"
                )}

                ${infoCard(
                    "Fecha de vuelta",
                    request.returnDate ||
                    "No aplica"
                )}

                ${infoCard(
                    "Pasajeros",
                    formatPassengers(request)
                )}

                ${infoCard(
                    "Método de pago",
                    request.paymentMethod
                )}

            </div>
        </section>
    `;

    if (
        request.scope === "Internacional"
    ) {
        html += `
            <section class="info-section">
                <h3>Información internacional</h3>

                <div class="info-grid">

                    ${infoCard(
                        "Dirección de residencia",
                        request.residenceAddress
                    )}

                    ${infoCard(
                        "Dirección de destino",
                        request.destinationAddress
                    )}

                </div>
            </section>
        `;
    }

    /* Fuente */

    if (request.source) {
        html += `
            <div class="alert info">
                Solicitud originada desde: <strong>${escapeHtml(
                    request.source
                )}</strong>
            </div>
        `;
    }

    /* Chat */

    html += `
        <section class="info-section">
            <h3>Historial de conversación</h3>

            <div class="admin-chat">
    `;

    conversation.messages.forEach(function (message) {
        html += `
            <div class="admin-message ${message.sender}">
                <div class="admin-message-meta">
                    ${escapeHtml(
                        message.sender === "user"
                            ? "Cliente"
                            : message.sender === "human"
                                ? "Encargado"
                                : "Asistente"
                    )}
                    ·
                    ${formatTime(message.timestamp)}
                </div>

                ${escapeHtml(message.text)}
            </div>
        `;
    });

    html += `
            </div>
        </section>
    `;

    adminDetail.innerHTML = html;

    const actionButtons =
        adminDetail.querySelectorAll(
            "[data-admin-action]"
        );

    actionButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const action =
                button.dataset.adminAction;

            if (action === "conclude") {
                concludeConversation(conversation);
            }

            if (action === "new-request") {
                state.activeConversationId =
                    conversation.id;

                startNewRequest(conversation);

                botMessage(
                    "Claro. Vamos a preparar una nueva solicitud. ✈️"
                );

                askName(conversation);

                saveState();
                renderEverything();
            }
        });
    });
}

/* =========================================================
   ESTADÍSTICAS
   ========================================================= */

function renderStats() {
    const conversations =
        state.conversations || [];

    const total =
        conversations.length;

    const automated =
        conversations.filter(function (conversation) {
            return (
                conversation.status ===
                "AUTOMATIZACIÓN ACTIVA"
            );
        }).length;

    const human =
        conversations.filter(function (conversation) {
            return (
                conversation.status ===
                "ATENCIÓN HUMANA"
            );
        }).length;

    const ready =
        conversations.filter(function (conversation) {
            return (
                conversation.status ===
                "LISTO PARA ENCARGADO"
            );
        }).length;

    adminStats.innerHTML = `
        ${statCard("Conversaciones", total)}
        ${statCard("Automatización", automated)}
        ${statCard("Atención humana", human)}
        ${statCard("Listas para cotizar", ready)}
    `;
}

function statCard(label, value) {
    return `
        <div class="stat-card">
            <span class="stat-label">${escapeHtml(label)}</span>
            <span class="stat-value">${value}</span>
        </div>
    `;
}

/* =========================================================
   RENDER GENERAL
   ========================================================= */

function renderEverything() {
    renderClient();

    renderAdminList();

    renderAdminDetail();

    renderStats();
}

/* =========================================================
   UTILIDADES ADMIN
   ========================================================= */

function getStatusClass(status) {
    if (status === "ATENCIÓN HUMANA") {
        return "human";
    }

    if (status === "LISTO PARA ENCARGADO") {
        return "ready";
    }

    if (status === "CONVERSACIÓN CONCLUIDA") {
        return "closed";
    }

    return "active";
}

function infoCard(label, value) {
    return `
        <div class="info-card">
            <span class="info-label">
                ${escapeHtml(label)}
            </span>

            <span class="info-value">
                ${escapeHtml(
                    safeValue(value)
                )}
            </span>
        </div>
    `;
}

function formatTime(timestamp) {
    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString(
        "es-VE",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

renderEverything();

/* =========================================================
   CORRECCIONES FINALES
   ========================================================= */

/*
 * 1. Mostrar en la conversación cualquier opción
 *    que el cliente seleccione mediante botones.
 */

const _originalHandleQuickReply = handleQuickReply;

handleQuickReply = function (value) {

    /*
     * Estos tres ya se muestran dentro de la función original,
     * así que evitamos que aparezcan duplicados.
     */
    const mainMenuValues = [
        "COTIZAR_NUEVO",
        "INSTAGRAM",
        "HABLAR_ENCARGADO"
    ];

    /*
     * Buscamos el botón que fue seleccionado para obtener
     * exactamente el texto que el cliente vio.
     */
    if (!mainMenuValues.includes(value)) {

        const buttons = clientQuick.querySelectorAll("button");

        let selectedButton = null;

        buttons.forEach(function (button) {
            if (button.dataset.value === value) {
                selectedButton = button;
            }
        });

        if (selectedButton) {
            const selectedText =
                selectedButton.textContent.trim();

            if (selectedText) {
                userMessage(selectedText);
            }
        }
    }

    /*
     * Continuamos con el funcionamiento original.
     */
    _originalHandleQuickReply(value);
};


/*
 * 2. Responder automáticamente cuando el cliente
 *    escriba "gracias", "muchas gracias", etc.
 */

const _originalHandleClientMessage = handleClientMessage;

handleClientMessage = function (text) {

    const conversation = getOrCreateActiveConversation();

    const normalized = normalize(text);

    /*
     * Detectar distintas formas de agradecer.
     */
    const isThanks =
        normalized === "gracias" ||
        normalized.includes("muchas gracias") ||
        normalized.includes("mil gracias") ||
        normalized.includes("gracias por todo") ||
        normalized.includes("te agradezco") ||
        normalized.includes("agradecido") ||
        normalized.includes("agradecida");

    /*
     * Si es un agradecimiento y el bot está activo,
     * mostramos el mensaje y respondemos.
     */
    if (isThanks && conversation.botEnabled) {

        userMessage(text);

        botMessage(
            "¡Con mucho gusto! 😊 Estamos para ayudarte. " +
            "Si necesitas realizar otra consulta o cotizar otro viaje, " +
            "puedes escribirme cuando quieras."
        );

        return;
    }

    /*
     * Para cualquier otro mensaje dejamos funcionar
     * exactamente el sistema original.
     */
    _originalHandleClientMessage(text);
};

/* ============================================================
   OTURMÉRIDA - FIREWALL DE INTENCIÓN
   PEGAR AL FINAL DE app.js
   ============================================================ */

(function () {

    // Mensajes claramente personales
    const mensajesPersonales = [
        "vas a salir",
        "vas a venir",
        "sales manana",
        "sales mañana",
        "salimos manana",
        "salimos mañana",
        "cuando vienes",
        "cuando vienes a verme",
        "donde andas",
        "donde estas",
        "cómo estás",
        "como estas",
        "que haces",
        "qué haces",
        "que haces hoy",
        "qué haces hoy",
        "nos vemos",
        "cuando nos vemos",
        "te extraño",
        "te extrano",
        "te quiero",
        "te amo",
        "mi amor",
        "mi vida",
        "me llamas",
        "llamame",
        "llámame",
        "me puedes llamar",
        "escribeme",
        "escríbeme",
        "mandame",
        "mándame",
        "mandame la foto",
        "mándame la foto",
        "mandame fotos",
        "mándame fotos",
        "hablamos luego"
    ];

    // Palabras que indican que realmente se está hablando de OturMérida
    const palabrasComerciales = [
        "viaje",
        "viajar",
        "cotizar",
        "cotizacion",
        "cotización",
        "precio",
        "precios",
        "pasaje",
        "pasajes",
        "boleto",
        "boletos",
        "vuelo",
        "vuelos",
        "hotel",
        "hoteles",
        "reserva",
        "reservar",
        "reservación",
        "reservacion",
        "paquete",
        "paquetes",
        "destino",
        "destinos",
        "aeropuerto",
        "turismo",
        "disponibilidad",
        "disponible",
        "tarifa",
        "tarifas",
        "equipaje",
        "maleta",
        "pasaporte",
        "cédula",
        "cedula",
        "pago",
        "pagar",
        "zelle",
        "transferencia"
    ];

    function limpiarTextoFirewall(texto) {
        return String(texto || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[¿?¡!.,;:()"'`]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function esMensajePersonal(texto) {

        const textoLimpio = limpiarTextoFirewall(texto);

        // Primero comprobamos si es comercial.
        // Lo comercial siempre tiene prioridad.
        const esComercial = palabrasComerciales.some(function (palabra) {
            return textoLimpio.includes(limpiarTextoFirewall(palabra));
        });

        if (esComercial) {
            return false;
        }

        // Después comprobamos si es personal.
        return mensajesPersonales.some(function (frase) {
            return textoLimpio.includes(limpiarTextoFirewall(frase));
        });
    }

    /*
     * Interceptamos handleClientMessage sin modificar
     * el código original del bot.
     */

    if (typeof window !== "undefined" &&
        typeof window.handleClientMessage === "function") {

        const funcionOriginal = window.handleClientMessage;

        window.handleClientMessage = function (texto) {

            if (esMensajePersonal(texto)) {

                console.log(
                    "🛡️ FIREWALL OTURMÉRIDA: mensaje PERSONAL detectado:",
                    texto
                );

                /*
                 * IMPORTANTE:
                 * No llamamos a la función original.
                 * Por lo tanto el bot NO responde.
                 */

                if (typeof userMessage === "function") {
                    userMessage(texto);
                }

                if (typeof saveState === "function") {
                    saveState();
                }

                if (typeof renderEverything === "function") {
                    renderEverything();
                }

                return;
            }

            /*
             * Si NO es personal,
             * dejamos que el bot original funcione exactamente igual.
             */

            return funcionOriginal.apply(this, arguments);
        };

        console.log("🛡️ Firewall de Intención OturMérida ACTIVADO");
    }

})();