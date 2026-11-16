export const STEPS = [
    "cover",
    "vehicle",
    "driver",
    "quote",
    "recap",
    "payment",
];

export const state = {
    step: 0,
    vehicle: { model_code: "i4", list_price: 5959000, delivery_date: "" },
    driver: {
        birth_date: "",
        licence_since: "",
        claims_3y: null,
        annual_km: null,
        postcode: "",
        parking: "",
        charging: "",
    },
    quote: null,
    selection: { package_id: null, options: [], frequency: null },
    holder: { first_name: "", last_name: "", email: "", phone: "" },
    consents: {
        pre_contractual_information: false,
        general_conditions: false,
        data_processing: false,
    },
    contract: null,
};

let onChange = () => {};

export function subscribe(fn) {
    onChange = fn;
}

export function goTo(index) {
    state.step = Math.max(0, Math.min(index, STEPS.length - 1));
    onChange();
}

// Une réponse (véhicule, conducteur) a changé : le devis et le choix fait dessus ne valent plus.
export function resetQuote() {
    state.quote = null;
    state.selection = { package_id: null, options: [], frequency: null };
}

export const next =() => goTo(state.step + 1);
export const back = () => goTo(state.step - 1);
