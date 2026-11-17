// Client de l'API Ardenne Assurance.
// USE_STUB = true : réponses tirées des exemples de la documentation API Ardenne, avec un délai simulé.
// USE_STUB = false : vrais appels HTTP vers BASE_URL (mock serveur).
const BASE_URL = "http://127.0.0.1:4000";
const USE_STUB = true;
const STUB_DELAY_MS = 900;

export class ApiError extends Error {
    constructor(status, code, message, requestId) {
        super(message);
        this.status = status;
        this.code = code;
        this.requestId = requestId;
    }
}

export function createQuote(payload) {
    return USE_STUB ? stubQuote(payload) : post("/v1/quotes", payload);
}

export function createContract(payload) {
    return USE_STUB ? stubContract(payload) : post("/v1/contracts", payload);
}

async function post(path, body) {
    let response;
    try {
        response = await fetch(BASE_URL + path, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-program": "bmw-fr-ev" },
            body: JSON.stringify(body),
        });
    } catch (networkError) {
        throw new ApiError(0, "network_error", networkError.message, null);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = data.error ?? {};
        throw new ApiError(response.status, error.code ?? "internal_error", error.message, error.request_id);
    }
    return data;
}

// ---------- Stubs (exemples de la documentation) ----------

const wait = () => new Promise((resolve) => setTimeout(resolve, STUB_DELAY_MS));

function yearsSince(isoDate) {
    const from = new Date(isoDate);
    const now = new Date();
    let years = now.getFullYear() - from.getFullYear();
    const beforeAnniversary =
        now.getMonth() < from.getMonth() ||
        (now.getMonth() === from.getMonth() && now.getDate() < from.getDate());
    return beforeAnniversary ? years - 1 : years;
}

function option(code, included, annual, monthly) {
    return { code, included, price: included ? { annual: 0, monthly: 0 } : { annual, monthly } };
}

async function stubQuote({ driver }) {
    await wait();
    if (yearsSince(driver.licence_since) < 2 || driver.claims_3y >= 3) {
        throw new ApiError(422, "driver_ineligible", "Driver does not meet eligibility rules", "req_stub_422");
    }
    return buildQuote();
}

function buildQuote() {
    return {
        quote_id: "qt_7f3a91c2",
        currency: "EUR",
        expires_at: "2027-05-21T10:00:00Z",
        packages: [
            {
                id: "essential",
                price: { annual: 42000, monthly: 3850 },
                options: [
                    option("WALLBOX", false, 4800, 440),
                    option("CABLE", false, 2400, 220),
                    option("BATTERY", false, 9600, 880),
                    option("STRANDED", false, 3600, 330),
                    option("GLASS", false, 6000, 550),
                ],
            },
            {
                id: "comfort",
                price: { annual: 61200, monthly: 5610 },
                options: [
                    option("WALLBOX", false, 4800, 440),
                    option("CABLE", true),
                    option("BATTERY", false, 9600, 880),
                    option("STRANDED", true),
                    option("GLASS", false, 6000, 550),
                ],
            },
            {
                id: "integral",
                price: { annual: 86400, monthly: 7920 },
                options: [
                    option("WALLBOX", true),
                    option("CABLE", true),
                    option("BATTERY", false, 9600, 880),
                    option("STRANDED", true),
                    option("GLASS", true),
                ],
            },
        ],
    };
}

// Le stub recalcule la prime à partir de la sélection, comme le ferait le vrai serveur,
// pour que l'écran de paiement affiche le montant réellement choisi.
async function stubContract({ package_id, options, frequency, consents }) {
    await wait();
    if (!Object.values(consents).every(Boolean)) {
        throw new ApiError(422, "consent_required", "All consents must be true", "req_stub_422");
    }
    const pkg = buildQuote().packages.find((p) => p.id === package_id);
    const premium = { annual: pkg.price.annual, monthly: pkg.price.monthly, frequency };
    for (const opt of pkg.options) {
        if (options.includes(opt.code)) {
            premium.annual += opt.price.annual;
            premium.monthly += opt.price.monthly;
        }
    }
    return {
        contract_id: "ctr_8d41b06f",
        policy_number: "ARD-FR-2026-0481233",
        status: "issued",
        starts_on: "2027-06-04",
        ends_on: "2028-06-03",
        premium,
        payment: {
            method: "atm_reference",
            entity: "21456",
            reference: "907318442",
            amount: premium[frequency],
            due_by: "2027-06-01",
        },
    };
}
