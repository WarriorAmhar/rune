/**
 * Extend the basic ActorSheet with custom functionality for RUNE
 */
export class RuneActorSheet extends ActorSheet {
  
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["rune", "sheet", "actor"],
      width: 900,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "inventory" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  /** @override */
  get template() {
    return `systems/rune/templates/actors/character-sheet.hbs`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    
    // Use a safe clone of the actor data for further operations
    const actorData = this.actor.toObject(false);
    
    // Add the actor's data to context for easier access
    context.system = actorData.system;
    context.flags = actorData.flags;
    
    // Prepare character data and items
    if (this.actor.type === 'character') {
      this._prepareCharacterData(context);
    } else if (this.actor.type === 'npc') {
      this._prepareNPCData(context);
    } else if (this.actor.type === 'creature') {
      this._prepareCreatureData(context);
    }
    
    // Prepare items
    this._prepareItems(context);
    
    // Add roll data for convenience
    context.rollData = this.actor.getRollData();
    
    return context;
  }

  /**
   * Organize and classify Items for Character sheets
   */
  _prepareCharacterData(context) {
    // Calculate total approach points
    const approaches = context.system.approaches;
    context.totalApproaches = approaches.might + approaches.guile + approaches.vision;
    
    // Check armor limits
    context.armorOverLimit = context.system.armor > 3;
    context.magicResistOverLimit = context.system.magicResist > 3;
  }

  /**
   * Organize and classify Items for NPC sheets
   */
  _prepareNPCData(context) {
    // NPCs can have same data as characters
    this._prepareCharacterData(context);
  }

  /**
   * Organize and classify Items for Creature sheets
   */
  _prepareCreatureData(context) {
    // Creatures can exceed armor limits
    context.canExceedArmorLimit = ["boss", "legendary"].includes(context.system.creatureType);
  }

  /**
   * Organize and classify Items
   */
  _prepareItems(context) {
    // Initialize containers
    const equipment = [];
    const weapons = [];
    const armor = [];
    const spells = [];
    const traits = [];
    
    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      
      // Append to appropriate array
      if (i.type === 'equipment') {
        equipment.push(i);
      } else if (i.type === 'weapon') {
        weapons.push(i);
      } else if (i.type === 'armor') {
        armor.push(i);
      } else if (i.type === 'spell') {
        spells.push(i);
      } else if (i.type === 'trait') {
        traits.push(i);
      }
    }
    
    // Assign and return
    context.equipment = equipment;
    context.weapons = weapons;
    context.armor = armor;
    context.spells = spells;
    context.traits = traits;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
    
    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));
    
    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });
    
    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) {
        item.delete();
        li.slideUp(200, () => this.render(false));
      }
    });
    
    // Toggle Equipment
    html.find('.toggle-equipped').change(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) {
        item.update({ "system.equipped": ev.currentTarget.checked });
      }
    });
    
    // Cast Spell
    html.find('.item-cast').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item && item.type === 'spell') {
        this._onCastSpell(item);
      }
    });
    
    // Rollable abilities (Approaches)
    html.find('.stat-roll').click(this._onRollApproach.bind(this));
    
    // Drag events for macros
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    
    // Prepare item data
    const itemData = {
      name: `Novo ${type.capitalize()}`,
      type: type,
      system: {}
    };
    
    // Set default image based on type
    switch(type) {
      case 'weapon':
        itemData.img = "icons/svg/sword.svg";
        break;
      case 'armor':
        itemData.img = "icons/svg/armor.svg";
        break;
      case 'spell':
        itemData.img = "icons/svg/fire.svg";
        break;
      case 'trait':
        itemData.img = "icons/svg/aura.svg";
        break;
      default:
        itemData.img = "icons/svg/item-bag.svg";
    }
    
    // Create the item
    const item = await Item.create(itemData, {parent: this.actor});
    return item;
  }

  /**
   * Handle rolling an approach check
   */
  async _onRollApproach(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const approach = element.dataset.approach;
    
    // Ask for advantage/disadvantage
    const dialogContent = `
      <form>
        <div class="form-group">
          <label>Vantagem/Desvantagem:</label>
          <select name="advantage">
            <option value="0">Normal</option>
            <option value="1">Vantagem (+1d6)</option>
            <option value="2">Vantagem x2 (+2d6)</option>
            <option value="-1">Desvantagem (-1d6)</option>
            <option value="-2">Desvantagem x2 (-2d6)</option>
          </select>
        </div>
      </form>
    `;
    
    new Dialog({
      title: `Rolar ${approach.capitalize()}`,
      content: dialogContent,
      buttons: {
        roll: {
          label: "Rolar",
          callback: html => {
            const advantage = parseInt(html.find('[name="advantage"]').val());
            this.actor.rollCheck(approach, advantage);
          }
        },
        cancel: {
          label: "Cancelar"
        }
      },
      default: "roll"
    }).render(true);
  }

  /**
   * Handle casting a spell
   */
  async _onCastSpell(item) {
    // Create a chat message announcing the spell cast
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="rune-spell-cast">
          <h3><i class="fas fa-magic"></i> ${item.name}</h3>
          <div class="spell-details">
            ${item.system.spellSchool ? `<div><strong>Escola:</strong> ${item.system.spellSchool}</div>` : ''}
            ${item.system.castingTime ? `<div><strong>Tempo de Conjuração:</strong> ${item.system.castingTime}</div>` : ''}
            ${item.system.range ? `<div><strong>Alcance:</strong> ${item.system.range}</div>` : ''}
            ${item.system.duration ? `<div><strong>Duração:</strong> ${item.system.duration}</div>` : ''}
          </div>
          <div class="spell-description">
            ${item.system.description || '<em>Sem descrição</em>'}
          </div>
        </div>
      `
    };
    
    ChatMessage.create(messageData);
  }
}

// Helper to capitalize strings
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};
