/**
 * @fileoverview Skill Integration - Adapted from OpenCode
 * 
 * Skill management system for custom agent capabilities
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/**
 * Skill Info
 */
export const Info = z.object({
  name: z.string(),
  description: z.string(),
  location: z.string(),
  content: z.string(),
});
export type Info = z.infer<typeof Info>;

/**
 * Skill Definition
 */
export const Definition = z.object({
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
  tools: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
});
export type Definition = z.infer<typeof Definition>;

// ============================================================================
// Skill Discovery
// ============================================================================

/**
 * Skill Discovery - Find skills in the project
 */
export namespace Discovery {
  const SKILL_PATTERNS = [
    '**/SKILL.md',
    '**/.claude/skills/**/*.md',
    '**/.agents/skills/**/*.md',
    '**/skills/**/*.md',
  ];

  /**
   * Find all skill files in a directory
   */
  export async function findSkills(rootDir: string): Promise<string[]> {
    const skills: string[] = [];

    async function walk(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip common non-skill directories
            if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
              continue;
            }
            await walk(fullPath);
          } else if (entry.name === 'SKILL.md' || entry.name.endsWith('.skill.md')) {
            skills.push(fullPath);
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    }

    await walk(rootDir);
    return skills;
  }

  /**
   * Parse a skill file
   */
  export async function parseSkill(filePath: string): Promise<Info | undefined> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!frontmatterMatch) {
        return undefined;
      }

      const frontmatter = frontmatterMatch[1];
      const body = frontmatterMatch[2];

      // Parse YAML frontmatter (simple parsing)
      const nameMatch = frontmatter.match(/name:\s*(.+)/);
      const descMatch = frontmatter.match(/description:\s*(.+)/);

      if (!nameMatch) {
        return undefined;
      }

      return {
        name: nameMatch[1].trim(),
        description: descMatch?.[1].trim() || '',
        location: filePath,
        content: body.trim(),
      };
    } catch {
      return undefined;
    }
  }
}

// ============================================================================
// Skill Namespace
// ============================================================================

export namespace Skill {
  const skills: Map<string, Info> = new Map();
  const eventEmitter = new EventEmitter();

  /**
   * Initialize skills
   */
  export async function init(rootDir?: string): Promise<void> {
    const dir = rootDir || process.cwd();
    const skillFiles = await Discovery.findSkills(dir);

    for (const file of skillFiles) {
      const skill = await Discovery.parseSkill(file);
      if (skill) {
        skills.set(skill.name, skill);
      }
    }

    console.log(`Loaded ${skills.size} skills`);
  }

  /**
   * Register a skill
   */
  export function register(skill: Info): void {
    skills.set(skill.name, skill);
    eventEmitter.emit('skill:registered', skill);
  }

  /**
   * Unregister a skill
   */
  export function unregister(name: string): void {
    skills.delete(name);
    eventEmitter.emit('skill:unregistered', name);
  }

  /**
   * Get a skill by name
   */
  export function get(name: string): Info | undefined {
    return skills.get(name);
  }

  /**
   * Get all skills
   */
  export function getAll(): Info[] {
    return Array.from(skills.values());
  }

  /**
   * Get skill names
   */
  export function getNames(): string[] {
    return Array.from(skills.keys());
  }

  /**
   * Check if a skill exists
   */
  export function has(name: string): boolean {
    return skills.has(name);
  }

  /**
   * Get skill content
   */
  export function getContent(name: string): string | undefined {
    return skills.get(name)?.content;
  }

  /**
   * Get skill description
   */
  export function getDescription(name: string): string | undefined {
    return skills.get(name)?.description;
  }

  /**
   * Search skills by description
   */
  export function search(query: string): Info[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(skills.values()).filter(
      skill =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Subscribe to events
   */
  export function on(event: string, listener: (...args: unknown[]) => void): void {
    eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from events
   */
  export function off(event: string, listener: (...args: unknown[]) => void): void {
    eventEmitter.off(event, listener);
  }

  /**
   * Clear all skills
   */
  export function clear(): void {
    skills.clear();
    eventEmitter.emit('skills:cleared');
  }

  /**
   * Get skill count
   */
  export function get count(): number {
    return skills.size;
  }
}

export default Skill;
