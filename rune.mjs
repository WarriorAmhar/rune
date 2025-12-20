import { RuneActor, RuneItem } from "./module/documents.mjs";
import { RuneActorSheet } from "./module/sheets/actor-sheet.mjs";
import { RuneItemSheet } from "./module/sheets/item-sheet.mjs";
import { 
  CharacterDataModel, 
  NpcDataModel, 
  CreatureDataModel,
  EquipmentDataModel,
  WeaponDataModel,
  ArmorDataModel,
  SpellDataModel,
  TraitDataModel
} from "./module/data-models.mjs";

/**
 * Initialization Hook
 */
Hooks.once("init", () => {
  console.log("RUNE | Initializing RUNE System");
  
  // Configure custom Document classes
  CONFIG.Actor.documentClass = RuneActor;
  CONFIG.Item.documentClass = RuneItem;
  
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("rune", RuneActorSheet, { 
    types: ["character", "npc", "creature"],
    makeDefault: true,
    label: "RUNE Character Sheet"
  });
  
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("rune", RuneItemSheet, {
    types: ["equipment", "weapon", "armor", "spell", "trait"],
    makeDefault: true,
    label: "RUNE Item Sheet"
  });
  
  // Configure Data Models for Actor sub-types
  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    npc: NpcDataModel,
    creature: CreatureDataModel
  };
  
  // Configure Data Models for Item sub-types
  CONFIG.Item.dataModels = {
    equipment: EquipmentDataModel,
    weapon: WeaponDataModel,
    armor: ArmorDataModel,
    spell: SpellDataModel,
    trait: TraitDataModel
  };
  
  // Configure trackable attributes for token bars
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["stamina"],
      value: [
        "approaches.might",
        "approaches.guile", 
        "approaches.vision",
        "armor",
        "magicResist",
        "level",
        "experience"
      ]
    },
    npc: {
      bar: ["stamina"],
      value: [
        "approaches.might",
        "approaches.guile",
        "approaches.vision",
        "armor",
        "magicResist"
      ]
    },
    creature: {
      bar: ["stamina"],
      value: [
        "approaches.might",
        "approaches.guile",
        "approaches.vision",
        "armor",
        "magicResist"
      ]
    }
  };
  
  // Register system settings
  registerSystemSettings();
  
  // Register Handlebars helpers
  registerHandlebarsHelpers();
  
  console.log("RUNE | System initialized");
});

/**
 * Register system settings
 */
function registerSystemSettings() {
  // Example setting for rolling in public vs private
  game.settings.register("rune", "publicRolls", {
    name: "Public Rolls by Default",
    hint: "Whether rolls should be public by default or private (GM only)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
}

/**
 * Register Handlebars helpers
 */
function registerHandlebarsHelpers() {
  // Helper to capitalize strings
  Handlebars.registerHelper('capitalize', function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
  
  // Helper to check if a number is positive
  Handlebars.registerHelper('isPositive', function(num) {
    return num > 0;
  });
  
  // Helper for approach colors
  Handlebars.registerHelper('approachColor', function(approach) {
    const colors = {
      might: '#c41e3a',
      guile: '#2c5aa0',
      vision: '#8b4789'
    };
    return colors[approach] || '#000';
  });
}

/**
 * Ready Hook - system is fully loaded
 */
Hooks.once("ready", () => {
  console.log("RUNE | System ready");
  
  // Add keyboard shortcuts or other ready-time setup
  setupMacros();
});

/**
 * Setup macro bar shortcuts
 */
function setupMacros() {
  // Quick roll macros could be added here
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type === "Actor") {
      createActorMacro(data, slot);
      return false;
    }
  });
}

/**
 * Create a macro for quick actor rolls
 */
async function createActorMacro(data, slot) {
  const actor = await fromUuid(data.uuid);
  if (!actor) return;
  
  const command = `game.actors.get("${actor.id}").rollCheck("might");`;
  
  let macro = game.macros.find(m => 
    m.name === `${actor.name} - Quick Roll` && m.command === command
  );
  
  if (!macro) {
    macro = await Macro.create({
      name: `${actor.name} - Quick Roll`,
      type: "script",
      img: actor.img,
      command: command
    });
  }
  
  game.user.assignHotbarMacro(macro, slot);
}

/**
 * Chat message hook to add button interactions
 */
Hooks.on("renderChatMessage", (message, html, data) => {
  // Could add interactive buttons to chat messages here
  // For example: "Apply Damage" buttons on attack rolls
});

/**
 * Export the RUNE namespace for console access
 */
window.RUNE = {
  Actor: RuneActor,
  Item: RuneItem,
  
  // Helper functions accessible from macros
  rollCheck: async function(actorId, approach, advantage = 0) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error("Actor not found!");
      return;
    }
    return actor.rollCheck(approach, advantage);
  },
  
  rollAttack: async function(actorId, approach, targetId = null, isMagic = false, advantage = 0) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error("Actor not found!");
      return;
    }
    
    const target = targetId ? game.actors.get(targetId) : null;
    return actor.rollAttack(approach, target, isMagic, advantage);
  }
};

console.log("RUNE | Namespace exported to window.RUNE");
