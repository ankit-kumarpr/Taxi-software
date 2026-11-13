/**
 * RegCheck / Car Registration API (India) — CheckIndia
 * Docs: https://www.regcheck.org.uk/api/reg.asmx?wsdl
 * Free test plate (India): WB24AE4770
 */

const textValue = (value) => {
    if (value == null) return "";
    if (typeof value === "object") {
        if (value.CurrentTextValue != null) return String(value.CurrentTextValue).trim();
        return "";
    }
    return String(value).trim();
};

const extractVehicleJson = (xml) => {
    const rawXml = String(xml || "");
    const cdata = rawXml.match(/<vehicleJson[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/vehicleJson>/i);
    const plain = rawXml.match(/<vehicleJson[^>]*>([\s\S]*?)<\/vehicleJson>/i);
    let raw = (cdata?.[1] || plain?.[1] || "").trim();
    if (!raw) {
        const err = new Error("RegCheck response did not include vehicleJson");
        err.status = 502;
        throw err;
    }
    raw = raw
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
    try {
        return JSON.parse(raw);
    } catch {
        const err = new Error("Failed to parse RegCheck vehicleJson");
        err.status = 502;
        throw err;
    }
};

const mapFuelType = (raw) => {
    const v = textValue(raw).toUpperCase();
    if (!v) return null;
    if (v.includes("DIESEL")) return "DIESEL";
    if (v.includes("PETROL") || v.includes("PETRO")) return "PETROL";
    if (v.includes("CNG")) return "CNG";
    if (v.includes("ELECTRIC") || v.includes("EV")) return "ELECTRIC";
    return null;
};

const mapTransmission = (raw) => {
    const v = textValue(raw).toUpperCase();
    if (!v) return null;
    if (v.includes("AUTO")) return "AUTOMATIC";
    if (v.includes("MANUAL")) return "MANUAL";
    return null;
};

const normalizeRegistrationNumber = (value) =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "");

/**
 * Flatten nested CurrentTextValue objects so we can store a clean dynamic snapshot.
 */
const flattenRegCheck = (data) => {
    if (!data || typeof data !== "object") return data;
    const out = {};
    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === "object" && !Array.isArray(value) && "CurrentTextValue" in value) {
            out[key] = value.CurrentTextValue;
        } else {
            out[key] = value;
        }
    }
    return out;
};

const KNOWN_FLAT_KEYS = new Set([
    "Description",
    "RegistrationYear",
    "RegistrationDate",
    "CarMake",
    "CarModel",
    "MakeDescription",
    "ModelDescription",
    "Variant",
    "EngineSize",
    "NumberOfSeats",
    "FuelType",
    "Transmission",
    "VechileIdentificationNumber",
    "VehicleIdentificationNumber",
    "EngineNumber",
    "Owner",
    "Fitness",
    "Insurance",
    "PUCC",
    "VehicleType",
    "Location",
    "Colour",
    "ImageUrl",
    "BodyStyle",
    "NumberOfDoors",
]);

/** Structured snapshot saved on Vehicle for clean UI */
const buildRcDetails = (data) => {
    const flat = flattenRegCheck(data || {});
    const make =
        textValue(data?.CarMake) ||
        textValue(data?.MakeDescription) ||
        String(flat.MakeDescription || flat.CarMake || "").trim();
    const model =
        textValue(data?.CarModel) ||
        textValue(data?.ModelDescription) ||
        String(flat.ModelDescription || flat.CarModel || "").trim();
    const description =
        textValue(data?.Description) ||
        [make, model].filter(Boolean).join(" ").trim();

    const extras = {};
    for (const [key, value] of Object.entries(flat)) {
        if (KNOWN_FLAT_KEYS.has(key)) continue;
        if (value == null || value === "") continue;
        if (typeof value === "object") {
            extras[key] = value;
        } else {
            extras[key] = value;
        }
    }

    return {
        description: description || "",
        make: make || "",
        model: model || "",
        variant: String(flat.Variant || "").trim(),
        registrationYear: String(flat.RegistrationYear || "").trim(),
        registrationDate: String(flat.RegistrationDate || "").trim(),
        vin: String(flat.VechileIdentificationNumber || flat.VehicleIdentificationNumber || "").trim(),
        engineNumber: String(flat.EngineNumber || "").trim(),
        engineSize: textValue(data?.EngineSize) || String(flat.EngineSize || "").trim(),
        fuelTypeApi: textValue(data?.FuelType) || String(flat.FuelType || "").trim(),
        transmissionApi: textValue(data?.Transmission) || String(flat.Transmission || "").trim(),
        seats: textValue(data?.NumberOfSeats) || String(flat.NumberOfSeats || "").trim(),
        owner: String(flat.Owner || "").trim(),
        fitness: String(flat.Fitness || "").trim(),
        insurance: String(flat.Insurance || "").trim(),
        pucc: String(flat.PUCC || "").trim(),
        apiVehicleType: String(flat.VehicleType || "").trim(),
        location: String(flat.Location || "").trim(),
        colour: String(flat.Colour || "").trim(),
        bodyStyle: textValue(data?.BodyStyle) || String(flat.BodyStyle || "").trim(),
        doors: textValue(data?.NumberOfDoors) || String(flat.NumberOfDoors || "").trim(),
        imageUrl: String(flat.ImageUrl || "").trim(),
        flat,
        extras,
    };
};

const buildSuggestedForm = (data) => {
    const details = buildRcDetails(data);
    const seats = Number.parseInt(details.seats, 10);

    return {
        vehicleName: details.description || "",
        fuelType: mapFuelType(data?.FuelType) || undefined,
        transmission: mapTransmission(data?.Transmission) || undefined,
        seatingCapacity: Number.isInteger(seats) && seats > 0 ? seats : undefined,
        make: details.make,
        model: details.model,
        registrationYear: details.registrationYear,
        registrationDate: details.registrationDate,
        vin: details.vin,
        engineNumber: details.engineNumber,
        owner: details.owner,
        insurance: details.insurance,
        pucc: details.pucc,
        fitness: details.fitness,
        location: details.location,
        colour: details.colour,
        variant: details.variant,
        imageUrl: details.imageUrl,
        apiVehicleType: details.apiVehicleType,
    };
};

/** Normalize any client/API payload into { raw, flat, details } for DB */
const normalizeRegCheckForSave = (payload) => {
    if (!payload) return null;
    let raw = payload;
    if (typeof payload === "string") {
        try {
            raw = JSON.parse(payload);
        } catch {
            return null;
        }
    }
    // Already wrapped from lookup API
    if (raw && typeof raw === "object" && (raw.raw || raw.flat || raw.suggested)) {
        const source = raw.raw || raw.flat || raw;
        const details = buildRcDetails(source);
        return {
            raw: raw.raw || source,
            flat: details.flat,
            details,
        };
    }
    const details = buildRcDetails(raw);
    return {
        raw,
        flat: details.flat,
        details,
    };
};

const lookupIndiaVehicle = async (registrationNumber) => {
    const username = String(process.env.REGCHECK_USERNAME || "").trim();
    if (!username) {
        const err = new Error("REGCHECK_USERNAME is not configured in backend .env");
        err.status = 500;
        throw err;
    }

    const number = normalizeRegistrationNumber(registrationNumber);
    if (!number) {
        const err = new Error("Registration number is required");
        err.status = 400;
        throw err;
    }

    const base = String(process.env.REGCHECK_BASE_URL || "https://www.regcheck.org.uk/api/reg.asmx").replace(/\/$/, "");
    const url = `${base}/CheckIndia?RegistrationNumber=${encodeURIComponent(number)}&username=${encodeURIComponent(username)}`;

    const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/xml, application/xml, */*" },
    });

    const xml = await response.text();
    if (!response.ok) {
        const err = new Error(`RegCheck API failed (${response.status})`);
        err.status = 502;
        err.details = xml?.slice?.(0, 500);
        throw err;
    }

    if (/out of credits|insufficient credit|invalid username|Access denied/i.test(xml)) {
        const err = new Error("RegCheck rejected the request (credits/username). Check REGCHECK_USERNAME.");
        err.status = 402;
        throw err;
    }

    const vehicleJson = extractVehicleJson(xml);
    // One-time console dump for debugging (as requested)
    console.log("[RegCheck CheckIndia] registration:", number);
    console.log("[RegCheck CheckIndia] raw vehicleJson response:", JSON.stringify(vehicleJson, null, 2));

    const details = buildRcDetails(vehicleJson);
    return {
        registrationNumber: number,
        raw: vehicleJson,
        flat: details.flat,
        details,
        suggested: buildSuggestedForm(vehicleJson),
    };
};

module.exports = {
    lookupIndiaVehicle,
    normalizeRegistrationNumber,
    flattenRegCheck,
    buildRcDetails,
    buildSuggestedForm,
    normalizeRegCheckForSave,
    textValue,
    mapFuelType,
    mapTransmission,
};
