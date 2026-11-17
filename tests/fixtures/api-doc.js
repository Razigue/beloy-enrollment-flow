// Exemples recopiés tels quels de la documentation API Ardenne (fournie avec le brief).
// Ils servent de référence : les stubs et l'état du wizard doivent leur correspondre.

const option = (code, included, annual, monthly) => ({ code, included, price: { annual, monthly } });

export const QUOTE_REQUEST = {
    program: "bmw-fr-ev",
    vehicle: { model_code: "i4", list_price: 5959000, delivery_date: "2027-06-04" },
    driver: {
        birth_date: "1994-03-18",
        licence_since: "2013-07-02",
        claims_3y: 0,
        annual_km: 12000,
        postcode: "75011",
        parking: "street",
        charging: "home",
    },
};

export const QUOTE_RESPONSE = {
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
                option("CABLE", true, 0, 0),
                option("BATTERY", false, 9600, 880),
                option("STRANDED", true, 0, 0),
                option("GLASS", false, 6000, 550),
            ],
        },
        {
            id: "integral",
            price: { annual: 86400, monthly: 7920 },
            options: [
                option("WALLBOX", true, 0, 0),
                option("CABLE", true, 0, 0),
                option("BATTERY", false, 9600, 880),
                option("STRANDED", true, 0, 0),
                option("GLASS", true, 0, 0),
            ],
        },
    ],
};

export const CONTRACT_REQUEST = {
    quote_id: "qt_7f3a91c2",
    package_id: "comfort",
    options: ["WALLBOX", "BATTERY", "GLASS"],
    frequency: "monthly",
    holder: { first_name: "Camille", last_name: "Fontaine", email: "camille.fontaine@example.fr", phone: "+33600000000" },
    consents: { pre_contractual_information: true, general_conditions: true, data_processing: true },
};

export const CONTRACT_RESPONSE = {
    contract_id: "ctr_8d41b06f",
    policy_number: "ARD-FR-2026-0481233",
    status: "issued",
    starts_on: "2027-06-04",
    ends_on: "2028-06-03",
    premium: { annual: 81600, monthly: 7480, frequency: "monthly" },
    payment: { method: "atm_reference", entity: "21456", reference: "907318442", amount: 7480, due_by: "2027-06-01" },
};
