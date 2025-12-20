const { HTMLField, NumberField, SchemaField, StringField, BooleanField } = foundry.data.fields;

/* -------------------------------------------- */
/*  Actor Data Models                           */
/* -------------------------------------------- */

/**
 * Base Actor model with common attributes
 */
class ActorDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Noxian Approaches
      approaches: new SchemaField({
        might: new NumberField({ 
          required: true, 
          integer: true, 
          min: 0, 
          max: 10,
          initial: 0,
          label: "Might"
        }),
        guile: new NumberField({ 
          required: true, 
          integer: true, 
          min: 0, 
          max: 10,
          initial: 0,
          label: "Guile"
        }),
        vision: new NumberField({ 
          required: true, 
          integer: true, 
          min: 0, 
          max: 10,
          initial: 0,
          label: "Vision"
        })
      }),
      
      // Resources
      stamina: new SchemaField({
        value: new NumberField({ 
          required: true, 
          integer: true, 
          initial: 10,
          label: "Current Stamina"
        }),
        max: new NumberField({ 
          required: true, 
          integer: true, 
          initial: 10,
          label: "Maximum Stamina"
        })
      }),
      
      // Resistances
      armor: new NumberField({ 
        required: true, 
        integer: true, 
        min: 0,
        initial: 0,
        label: "Armor"
      }),
      
      magicResist: new NumberField({ 
        required: true, 
        integer: true, 
        min: 0,
        initial: 0,
        label: "Magic Resistance"
      }),
      
      // Biography and additional fields
      biography: new HTMLField({ 
        required: false, 
        blank: true,
        label: "Biography"
      }),
      
      spellsInventions: new HTMLField({
        required: false,
        blank: true,
        label: "Spells/Inventions"
      }),
      
      currency: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 1000,
        label: "Currency"
      }),
      
      pronouns: new StringField({
        required: false,
        blank: true,
        label: "Pronouns"
      }),
      
      origin: new StringField({
        required: false,
        blank: true,
        label: "Origin"
      }),
      
      class: new StringField({
        required: false,
        blank: true,
        label: "Class"
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Clamp stamina within appropriate range
    this.stamina.value = Math.clamp(this.stamina.value, 0, this.stamina.max);
    
    // Calculate total approaches (for validation)
    this.totalApproaches = this.approaches.might + this.approaches.guile + this.approaches.vision;
  }
}

/**
 * Player Character data model
 */
export class CharacterDataModel extends ActorDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      // Character-specific fields
      level: new NumberField({ 
        required: true, 
        integer: true, 
        min: 1,
        initial: 1,
        label: "Level"
      }),
      
      experience: new NumberField({ 
        required: true, 
        integer: true, 
        min: 0,
        initial: 0,
        label: "Experience"
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    // PCs have max 3 armor from equipment
    if (this.armor > 3) {
      this.baseArmor = this.armor;
      this.armorOverMax = true;
    }
    
    // PCs have max 3 magic resist from equipment
    if (this.magicResist > 3) {
      this.baseMagicResist = this.magicResist;
      this.magicResistOverMax = true;
    }
  }
}

/**
 * NPC data model - for minor NPCs
 */
export class NpcDataModel extends ActorDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      // NPC-specific
      disposition: new StringField({
        required: true,
        blank: false,
        options: ["friendly", "neutral", "hostile"],
        initial: "neutral",
        label: "Disposition"
      })
    };
  }
}

/**
 * Creature data model - for monsters, bosses, legendary creatures
 */
export class CreatureDataModel extends ActorDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      // Creature type
      creatureType: new StringField({
        required: true,
        blank: false,
        options: ["common", "elite", "boss", "legendary"],
        initial: "common",
        label: "Creature Type"
      }),
      
      // Special abilities description
      specialAbilities: new HTMLField({ 
        required: false, 
        blank: true,
        label: "Special Abilities"
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Bosses and legendary creatures can exceed normal armor limits
    this.ignoresArmorLimit = ["boss", "legendary"].includes(this.creatureType);
  }
}

/* -------------------------------------------- */
/*  Item Data Models                            */
/* -------------------------------------------- */

/**
 * Base Item model
 */
class ItemDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ 
        required: false, 
        blank: true,
        label: "Description"
      }),
      
      quantity: new NumberField({ 
        required: true, 
        integer: true, 
        min: 0,
        initial: 1,
        label: "Quantity"
      })
    };
  }
}

/**
 * Equipment item model
 */
export class EquipmentDataModel extends ItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      equipped: new BooleanField({
        required: true,
        initial: false,
        label: "Equipped"
      })
    };
  }
}

/**
 * Weapon item model
 */
export class WeaponDataModel extends ItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      equipped: new BooleanField({
        required: true,
        initial: false,
        label: "Equipped"
      }),
      
      weaponType: new StringField({
        required: true,
        blank: false,
        options: ["melee", "ranged", "magic"],
        initial: "melee",
        label: "Weapon Type"
      }),
      
      // Weapons don't have fixed damage in RUNE, but we track this for reference
      damageNote: new StringField({
        required: false,
        blank: true,
        initial: "Damage = Attack Roll - Target Armor",
        label: "Damage Notes"
      })
    };
  }
}

/**
 * Armor item model
 */
export class ArmorDataModel extends ItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      equipped: new BooleanField({
        required: true,
        initial: false,
        label: "Equipped"
      }),
      
      armorValue: new NumberField({ 
        required: true, 
        integer: true, 
        min: 0,
        max: 3,
        initial: 1,
        label: "Armor Value"
      }),
      
      magicResistValue: new NumberField({ 
        required: true, 
        integer: true, 
        min: 0,
        max: 3,
        initial: 0,
        label: "Magic Resistance Value"
      }),
      
      armorType: new StringField({
        required: true,
        blank: false,
        options: ["light", "medium", "heavy", "shield"],
        initial: "light",
        label: "Armor Type"
      })
    };
  }
}

/**
 * Spell item model
 */
export class SpellDataModel extends ItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      spellSchool: new StringField({
        required: false,
        blank: true,
        label: "School of Magic"
      }),
      
      castingTime: new StringField({
        required: false,
        blank: true,
        initial: "1 action",
        label: "Casting Time"
      }),
      
      range: new StringField({
        required: false,
        blank: true,
        initial: "Touch",
        label: "Range"
      }),
      
      duration: new StringField({
        required: false,
        blank: true,
        initial: "Instantaneous",
        label: "Duration"
      })
    };
  }
}

/**
 * Trait item model - for advantages, features, backgrounds, etc.
 */
export class TraitDataModel extends ItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      
      traitType: new StringField({
        required: true,
        blank: false,
        options: ["advantage", "background", "feature", "flaw"],
        initial: "feature",
        label: "Trait Type"
      }),
      
      grantsAdvantage: new BooleanField({
        required: true,
        initial: false,
        label: "Grants Advantage on Checks"
      }),
      
      advantageConditions: new StringField({
        required: false,
        blank: true,
        label: "Conditions for Advantage"
      })
    };
  }
}
