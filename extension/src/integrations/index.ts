/**
 * @fileoverview Integrations Module - Main Entry Point
 * 
 * This module provides integrations with external systems:
 * - LSP: Language Server Protocol integration
 * - MCP: Model Context Protocol integration
 * - Skill: Skill management system
 * 
 * @version 2.0.0
 */

// LSP Integration
export * from './lsp';

// MCP Integration
export * from './mcp';

// Skill Integration
export * from './skill';

// ============================================================================
// Integration Manager
// ============================================================================

import { EventEmitter } from 'events';
import type { LSP } from './lsp';
import type { MCP } from './mcp';
import type { Skill } from './skill';

/**
 * Integration Manager - Manages all integrations
 */
export class IntegrationManager extends EventEmitter {
  private lsp: typeof LSP | null = null;
  private mcp: typeof MCP | null = null;
  private skill: typeof Skill | null = null;
  private initialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize all integrations
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize LSP
      const { LSP } = await import('./lsp');
      this.lsp = LSP;
      await this.lsp.init();
      this.emit('lsp:initialized');

      // Initialize MCP
      const { MCP } = await import('./mcp');
      this.mcp = MCP;
      this.emit('mcp:initialized');

      // Initialize Skill
      const { Skill } = await import('./skill');
      this.skill = Skill;
      this.emit('skill:initialized');

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get LSP integration
   */
  public getLSP(): typeof LSP | null {
    return this.lsp;
  }

  /**
   * Get MCP integration
   */
  public getMCP(): typeof MCP | null {
    return this.mcp;
  }

  /**
   * Get Skill integration
   */
  public getSkill(): typeof Skill | null {
    return this.skill;
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown all integrations
   */
  public async shutdown(): Promise<void> {
    this.emit('shutdown');
    this.initialized = false;
  }
}

/**
 * Global integration manager instance
 */
export const globalIntegrationManager = new IntegrationManager();
