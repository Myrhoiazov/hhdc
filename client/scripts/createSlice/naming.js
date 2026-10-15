// The names a slice is built from, checked against the conventions of its layer
// (.agents/rules/fsd-architecture.md): entities, widgets and pages are PascalCase,
// a feature is a camelCase verb and noun, and a page slice always ends with "Page".
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const CAMEL = /^[a-z][A-Za-z0-9]*$/;

const upperFirst = (text) => text[0].toUpperCase() + text.slice(1);
const lowerFirst = (text) => text[0].toLowerCase() + text.slice(1);

const NAMING = {
    entities: { pattern: PASCAL, example: 'Venue', slice: (name) => name },
    widgets: { pattern: PASCAL, example: 'EventSchedule', slice: (name) => name },
    pages: {
        pattern: PASCAL,
        example: 'Venues',
        slice: (name) => (name.endsWith('Page') ? name : `${name}Page`),
    },
    features: { pattern: CAMEL, example: 'addVenue', slice: (name) => name },
};

const LAYERS = Object.keys(NAMING);

const namesFor = (layer, rawName) => {
    const rule = NAMING[layer];
    if (!rule) throw new Error(`Layer must be one of: ${LAYERS.join(', ')}`);
    if (!rawName || !rule.pattern.test(rawName)) {
        throw new Error(`Name a slice of ${layer} like "${rule.example}", got "${rawName ?? ''}"`);
    }
    const slice = rule.slice(rawName);
    return { slice, component: upperFirst(slice), camel: lowerFirst(slice) };
};

module.exports = { LAYERS, namesFor };
