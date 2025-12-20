/**
 * Extend the basic ItemSheet with custom functionality for RUNE
 */
export class RuneItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["rune", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: []
    });
  }

  /** @override */
  get template() {
    return `systems/rune/templates/items/item-sheet.hbs`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    
    // Use a safe clone of the item data
    const itemData = this.item.toObject(false);
    
    // Add the item's data to context
    context.system = itemData.system;
    context.flags = itemData.flags;
    
    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Handle any special item sheet interactions here
  }
}
