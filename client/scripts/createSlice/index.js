// npm run generate:slice <layer> <Name>
// Creates a slice laid out by .claude/rules/fsd-architecture.md.
const { LAYERS, namesFor } = require('./naming');
const writeSlice = require('./writeSlice');

const TEMPLATES = {
    entities: require('./templates/entity'),
    features: require('./templates/component'),
    widgets: require('./templates/component'),
    pages: require('./templates/page'),
};

// What is left to do by hand once the files exist.
const NEXT_STEPS = {
    entities: 'Describe the types, replace the placeholder request, and put the rules of the entity in model/ with tests.',
    features: 'Build the action in ui/ and its logic in model/.',
    widgets: 'Build the block in ui/ and its logic in model/.',
    pages: 'Add the route to RoutePath (shared/config/routeConfig) and to routeConfig (app/providers/router).',
};

const run = ([layer, rawName]) => {
    const names = namesFor(layer, rawName);
    const written = writeSlice(layer, names.slice, TEMPLATES[layer](names));
    console.log(`Created ${layer}/${names.slice}:\n  ${written.join('\n  ')}`);
    console.log(`Next: ${NEXT_STEPS[layer]}`);
};

try {
    run(process.argv.slice(2));
} catch (error) {
    console.error(`${error.message}\nUsage: npm run generate:slice <${LAYERS.join('|')}> <Name>`);
    process.exitCode = 1;
}
