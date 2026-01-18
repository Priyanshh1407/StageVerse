// lib/riderTemplates.js

export const riderTemplates = {
    new_assignment: {
        English: () => `Artist Message: New Event Assigned - Rider Details`
    },
    fixture_added: {
        English: (fixtureName) => `Artist Message: New Fixture Added (${fixtureName})`
    },
    fixture_removed: {
        English: (fixtureName) => `Artist Message: Fixture Removed (${fixtureName})`
    },
    count_updated: {
        English: (fixtureName, oldVal, newVal) => `Artist Message: Count Updated (${fixtureName}: ${oldVal} ➝ ${newVal})`
    },
    stage_plot_updated: {
        English: (feature, oldVal, newVal) => `Artist Message: Stage Plot Update (${feature}: ${oldVal} ➝ ${newVal})`
    },
    hazer_updated: {
        English: (oldVal, newVal) => `Artist Message: Hazer Request Update (${oldVal} ➝ ${newVal})`
    },
    multi_count_updated: {
        English: (count) => `Artist Message: Gear Counts Updated (${count} Items)`
    },
    multi_plot_updated: {
        English: () => `Artist Message: Stage Plot & Placement Updated`
    },
    general_update: {
        English: (count) => `Artist Message: Rider Update - ${count} Changes`
    }
};

export const getRiderMessage = (key, params = {}, lang = 'English') => {
    const templateGroup = riderTemplates[key];
    if (!templateGroup) return 'Artist Message: Update';

    const generator = templateGroup[lang] || templateGroup['English'];
    if (!generator) return 'Artist Message: Update';

    return generator(params); // Params can be single value or object depending on template
};
