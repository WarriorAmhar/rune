/**
 * Extended Actor class for RUNE system
 */
export class RuneActor extends Actor {
  
  /**
   * Roll a difficulty check using 2d6 + Approach
   * @param {string} approach - The approach to use: "might", "guile", or "vision"
   * @param {number} advantage - Number of advantage/disadvantage dice (positive for advantage, negative for disadvantage)
   * @returns {Promise<ChatMessage>}
   */
  async rollCheck(approach, advantage = 0) {
    const approachValue = this.system.approaches[approach] || 0;
    
    // Determine number of dice to roll
    const numDice = 2 + Math.abs(advantage);
    
    // Roll the dice
    const roll = await new Roll(`${numDice}d6`).evaluate();
    
    // Sort dice results
    const sortedDice = roll.dice[0].results.map(r => r.result).sort((a, b) => b - a);
    
    // Select appropriate dice based on advantage/disadvantage
    let selectedDice;
    if (advantage > 0) {
      // Advantage: take highest 2
      selectedDice = sortedDice.slice(0, 2);
    } else if (advantage < 0) {
      // Disadvantage: take lowest 2
      selectedDice = sortedDice.slice(-2);
    } else {
      // Normal: take first 2 (which are all the dice)
      selectedDice = sortedDice.slice(0, 2);
    }
    
    const diceTotal = selectedDice.reduce((sum, die) => sum + die, 0);
    const total = diceTotal + approachValue;
    
    // Determine outcome
    let outcome, outcomeClass;
    const isGlory = selectedDice[0] === 6 && selectedDice[1] === 6;
    const isRuin = selectedDice[0] === 1 && selectedDice[1] === 1;
    
    if (isGlory) {
      outcome = "GLORY! (6-6)";
      outcomeClass = "glory";
    } else if (isRuin) {
      outcome = "RUIN! (1-1)";
      outcomeClass = "ruin";
    } else if (total >= 10) {
      outcome = "SUCCESS!";
      outcomeClass = "success";
    } else if (total >= 6) {
      outcome = "COMPLICATION";
      outcomeClass = "complication";
    } else {
      outcome = "FAILURE";
      outcomeClass = "failure";
    }
    
    // Create chat message
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${approach.toUpperCase()} Check${advantage !== 0 ? ` (${Math.abs(advantage)} ${advantage > 0 ? 'Advantage' : 'Disadvantage'})` : ''}`,
      content: `
        <div class="rune-check ${outcomeClass}">
          <h3>${outcome}</h3>
          <div class="dice-results">
            <span class="dice-rolled">Rolled: ${sortedDice.join(', ')}</span>
            ${advantage !== 0 ? `<br><span class="dice-used">Used: ${selectedDice.join(' + ')}</span>` : ''}
          </div>
          <div class="check-math">
            ${selectedDice.join(' + ')} + ${approachValue} (${approach}) = <strong>${total}</strong>
          </div>
          <div class="outcome-description">
            ${this._getOutcomeDescription(outcome, outcomeClass)}
          </div>
        </div>
      `,
      roll: roll,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL
    };
    
    return ChatMessage.create(messageData);
  }
  
  /**
   * Get description text for check outcome
   */
  _getOutcomeDescription(outcome, outcomeClass) {
    switch (outcomeClass) {
      case "glory":
        return "The character must be rewarded appropriately!";
      case "ruin":
        return "Suffer all consequences and a major disaster!";
      case "success":
        return "The action succeeds without problem.";
      case "complication":
        return "Partially successful. Something goes wrong.";
      case "failure":
        return "Suffer all of the action's consequences.";
      default:
        return "";
    }
  }
  
  /**
   * Roll an attack against a target
   * @param {string} approach - The approach to use for the attack
   * @param {Actor} target - The target actor
   * @param {boolean} isMagic - Whether this is a magic attack
   * @param {number} advantage - Advantage/disadvantage modifier
   */
  async rollAttack(approach, target = null, isMagic = false, advantage = 0) {
    const approachValue = this.system.approaches[approach] || 0;
    
    // Determine number of dice to roll
    const numDice = 2 + Math.abs(advantage);
    
    // Roll the dice
    const roll = await new Roll(`${numDice}d6`).evaluate();
    
    // Sort and select dice
    const sortedDice = roll.dice[0].results.map(r => r.result).sort((a, b) => b - a);
    let selectedDice;
    if (advantage > 0) {
      selectedDice = sortedDice.slice(0, 2);
    } else if (advantage < 0) {
      selectedDice = sortedDice.slice(-2);
    } else {
      selectedDice = sortedDice.slice(0, 2);
    }
    
    const diceTotal = selectedDice.reduce((sum, die) => sum + die, 0);
    const attackTotal = diceTotal + approachValue;
    
    // Check for Glory/Ruin
    const isGlory = selectedDice[0] === 6 && selectedDice[1] === 6;
    const isRuin = selectedDice[0] === 1 && selectedDice[1] === 1;
    
    let messageContent = `
      <div class="rune-attack">
        <h3>Attack Roll</h3>
        <div class="dice-results">
          <span class="dice-rolled">Rolled: ${sortedDice.join(', ')}</span>
          ${advantage !== 0 ? `<br><span class="dice-used">Used: ${selectedDice.join(' + ')}</span>` : ''}
        </div>
        <div class="attack-math">
          ${selectedDice.join(' + ')} + ${approachValue} (${approach}) = <strong>${attackTotal}</strong>
        </div>
    `;
    
    if (target) {
      const resistance = isMagic ? target.system.magicResist : target.system.armor;
      const damage = Math.max(0, attackTotal - resistance);
      
      let outcome, outcomeClass;
      if (isGlory) {
        outcome = "GLORY!";
        outcomeClass = "glory";
      } else if (isRuin) {
        outcome = "RUIN!";
        outcomeClass = "ruin";
      } else if (attackTotal > resistance) {
        outcome = "HIT!";
        outcomeClass = "success";
      } else if (attackTotal === resistance) {
        outcome = "BLOCKED";
        outcomeClass = "complication";
      } else {
        outcome = "MISS";
        outcomeClass = "failure";
      }
      
      messageContent += `
        <div class="target-info">
          <strong>Target:</strong> ${target.name}<br>
          <strong>${isMagic ? 'Magic Resistance' : 'Armor'}:</strong> ${resistance}
        </div>
        <div class="attack-outcome ${outcomeClass}">
          <h4>${outcome}</h4>
          ${damage > 0 ? `<div class="damage"><strong>Damage:</strong> ${damage}</div>` : ''}
        </div>
      `;
    }
    
    messageContent += `</div>`;
    
    // Create chat message
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${approach.toUpperCase()} Attack${isMagic ? ' (Magic)' : ''}${advantage !== 0 ? ` (${Math.abs(advantage)} ${advantage > 0 ? 'Advantage' : 'Disadvantage'})` : ''}`,
      content: messageContent,
      roll: roll,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL
    };
    
    return ChatMessage.create(messageData);
  }
  
  /**
   * Apply damage to this actor's stamina
   * @param {number} damage - Amount of damage to apply
   */
  async applyDamage(damage) {
    const currentStamina = this.system.stamina.value;
    const newStamina = Math.max(0, currentStamina - damage);
    
    await this.update({ "system.stamina.value": newStamina });
    
    // Create a chat message
    const isLethal = newStamina === 0;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="rune-damage ${isLethal ? 'lethal' : ''}">
          <strong>${this.name}</strong> takes <strong>${damage}</strong> damage!
          <br>Stamina: ${currentStamina} → ${newStamina}
          ${isLethal ? '<br><span class="lethal-warning">⚠️ STAMINA DEPLETED! Next hit is lethal!</span>' : ''}
        </div>
      `
    });
  }
  
  /**
   * Heal stamina
   * @param {number} amount - Amount to heal
   */
  async healStamina(amount) {
    const currentStamina = this.system.stamina.value;
    const maxStamina = this.system.stamina.max;
    const newStamina = Math.min(maxStamina, currentStamina + amount);
    const actualHealing = newStamina - currentStamina;
    
    if (actualHealing > 0) {
      await this.update({ "system.stamina.value": newStamina });
      
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `
          <div class="rune-healing">
            <strong>${this.name}</strong> recovers <strong>${actualHealing}</strong> stamina!
            <br>Stamina: ${currentStamina} → ${newStamina}
          </div>
        `
      });
    }
  }
  
  /**
   * Calculate total armor from equipped items
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Calculate armor and magic resist from equipped items
    if (this.items) {
      let totalArmor = 0;
      let totalMagicResist = 0;
      
      this.items.forEach(item => {
        if (item.type === "armor" && item.system.equipped) {
          totalArmor += item.system.armorValue || 0;
          totalMagicResist += item.system.magicResistValue || 0;
        }
      });
      
      // Update armor values (respecting PC limits if character type)
      if (this.type === "character") {
        this.system.armor = Math.min(totalArmor, 3);
        this.system.magicResist = Math.min(totalMagicResist, 3);
      } else {
        this.system.armor = totalArmor;
        this.system.magicResist = totalMagicResist;
      }
    }
  }
}

/**
 * Extended Item class for RUNE system
 */
export class RuneItem extends Item {
  
  /**
   * Toggle equipped status
   */
  async toggleEquipped() {
    if (this.system.equipped !== undefined) {
      await this.update({ "system.equipped": !this.system.equipped });
    }
  }
  
  /**
   * Check if this item grants advantage
   */
  grantsAdvantage() {
    return this.type === "trait" && this.system.grantsAdvantage;
  }
  
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Add any item-specific derived data here
  }
}
