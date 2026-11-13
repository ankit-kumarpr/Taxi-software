/** Human labels for known RegCheck keys */
const LABEL_MAP = {
  Description: "Description",
  RegistrationYear: "Registration year",
  RegistrationDate: "Registration date",
  CarMake: "Make",
  CarModel: "Model",
  MakeDescription: "Make description",
  ModelDescription: "Model description",
  Variant: "Variant",
  EngineSize: "Engine size",
  EngineNumber: "Engine number",
  NumberOfSeats: "Number of seats",
  FuelType: "Fuel type",
  Transmission: "Transmission",
  VechileIdentificationNumber: "VIN / chassis",
  VehicleIdentificationNumber: "VIN / chassis",
  Owner: "Owner",
  Fitness: "Fitness",
  Insurance: "Insurance",
  PUCC: "PUCC",
  VehicleType: "RC vehicle class",
  Location: "RTO / location",
  Colour: "Colour",
  Color: "Colour",
  BodyStyle: "Body style",
  NumberOfDoors: "Doors",
  ImageUrl: "Image URL",
  ABICode: "ABI code",
  Immobiliser: "Immobiliser",
  DriverSide: "Driver side",
  VehicleInsuranceGroup: "Insurance group",
  VehicleInsuranceGroupOutOf: "Insurance group out of",
  EngineCode: "Engine code",
};

export function humanizeKey(key) {
  if (LABEL_MAP[key]) return LABEL_MAP[key];
  return String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Unwrap CurrentTextValue and deep-flatten nested objects/arrays into rows */
export function flattenRegCheckForDisplay(input, prefix = "") {
  if (input == null) return [];

  // Lookup wrapper from our API
  if (
    typeof input === "object" &&
    !Array.isArray(input) &&
    (input.raw || input.flat || input.details)
  ) {
    const source = input.raw || input.flat || input.details?.flat || input.details;
    return flattenRegCheckForDisplay(source, prefix);
  }

  if (typeof input !== "object") {
    return [
      {
        key: prefix || "value",
        label: humanizeKey(prefix || "value"),
        value: String(input),
        isImage: false,
        isEmpty: String(input).trim() === "",
      },
    ];
  }

  if (Array.isArray(input)) {
    if (!input.length) {
      return [
        {
          key: prefix || "list",
          label: humanizeKey(prefix || "list"),
          value: "—",
          isImage: false,
          isEmpty: true,
        },
      ];
    }
    // [[k,v], ...] style Extended arrays
    if (input.every((row) => Array.isArray(row) && row.length >= 2 && typeof row[0] === "string")) {
      return input.flatMap(([k, v]) =>
        flattenRegCheckForDisplay(v, prefix ? `${prefix}.${k}` : k)
      );
    }
    return input.flatMap((item, idx) =>
      flattenRegCheckForDisplay(item, prefix ? `${prefix}[${idx}]` : `[${idx}]`)
    );
  }

  // { CurrentTextValue: "..." }
  if ("CurrentTextValue" in input && Object.keys(input).length <= 3) {
    const val = input.CurrentTextValue;
    const display = val == null || val === "" ? "—" : String(val);
    return [
      {
        key: prefix || "value",
        label: humanizeKey(prefix || "value"),
        value: display,
        isImage: false,
        isEmpty: display === "—",
      },
    ];
  }

  const rows = [];
  for (const [key, value] of Object.entries(input)) {
    // Skip internal helper blobs that duplicate the raw fields
    if (key === "flat" || key === "extras" || key === "suggested" || key === "details") continue;
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value) && "CurrentTextValue" in value) {
      const val = value.CurrentTextValue;
      const display = val == null || String(val).trim() === "" ? "—" : String(val);
      rows.push({
        key: path,
        label: humanizeKey(key),
        value: display,
        isImage: false,
        isEmpty: display === "—",
      });
      continue;
    }

    if (value && typeof value === "object") {
      rows.push(...flattenRegCheckForDisplay(value, path));
      continue;
    }

    const display = value == null || String(value).trim() === "" ? "—" : String(value);
    rows.push({
      key: path,
      label: humanizeKey(key),
      value: display,
      isImage: /imageurl$/i.test(key) || /^https?:\/\//i.test(display),
      isEmpty: display === "—",
    });
  }

  // Prefer unique leaf keys; keep order
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.key)) return false;
    seen.add(row.key);
    return true;
  });
}

export function pickImageUrl(input) {
  const rows = flattenRegCheckForDisplay(input);
  const imageRow = rows.find((r) => /imageurl$/i.test(r.key) && !r.isEmpty);
  return imageRow?.value || null;
}
