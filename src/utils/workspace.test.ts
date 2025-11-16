/**
 * Unit tests for Workspace Manager
 */

import { WorkspaceManager } from './workspace';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { URI } from 'vscode-uri';

describe('WorkspaceManager', () => {
  let testDir: string;
  let workspaceManager: WorkspaceManager;

  beforeEach(() => {
    // Create a temporary directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'modsim-test-'));
    workspaceManager = new WorkspaceManager();
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize with empty workspace', async () => {
      await workspaceManager.initialize([]);
      expect(workspaceManager.getAllDocuments()).toHaveLength(0);
    });

    it('should index .mod files in workspace', async () => {
      // Create test .mod files
      const modFile1 = path.join(testDir, 'Module1.mod');
      const modFile2 = path.join(testDir, 'Module2.mod');

      fs.writeFileSync(
        modFile1,
        `DEFINITION MODULE Module1;
TYPE MyType = INTEGER;
END MODULE.`
      );
      fs.writeFileSync(
        modFile2,
        `DEFINITION MODULE Module2;
TYPE OtherType = INTEGER;
END MODULE.`
      );

      await workspaceManager.initialize([testDir]);

      const docs = workspaceManager.getAllDocuments();
      expect(docs.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip non-.mod files', async () => {
      // Create test files
      const modFile = path.join(testDir, 'Module1.mod');
      const txtFile = path.join(testDir, 'readme.txt');

      fs.writeFileSync(
        modFile,
        `DEFINITION MODULE Module1;
TYPE T = INTEGER;
END MODULE.`
      );
      fs.writeFileSync(txtFile, 'This is a text file');

      await workspaceManager.initialize([testDir]);

      const docs = workspaceManager.getAllDocuments();
      // Should only have the .mod file
      expect(docs.length).toBe(1);
    });

    it('should skip node_modules directory', async () => {
      // Create node_modules directory
      const nodeModulesDir = path.join(testDir, 'node_modules');
      fs.mkdirSync(nodeModulesDir);

      const modFile1 = path.join(testDir, 'Module1.mod');
      const modFile2 = path.join(nodeModulesDir, 'Module2.mod');

      fs.writeFileSync(
        modFile1,
        `DEFINITION MODULE Module1;
TYPE T = INTEGER;
END MODULE.`
      );
      fs.writeFileSync(
        modFile2,
        `DEFINITION MODULE Module2;
TYPE T = INTEGER;
END MODULE.`
      );

      await workspaceManager.initialize([testDir]);

      const docs = workspaceManager.getAllDocuments();
      // Should only have Module1, not Module2 from node_modules
      expect(docs.length).toBe(1);
    });
  });

  describe('Document Updates', () => {
    it('should update document when content changes', async () => {
      const uri = URI.file(path.join(testDir, 'Module1.mod')).toString();
      const content1 = `DEFINITION MODULE Module1;
TYPE T = INTEGER;
END MODULE.`;
      const content2 = `DEFINITION MODULE Module1;
TYPE Count = INTEGER;
END MODULE.`;

      // Initial update
      await workspaceManager.updateDocument(uri, content1, 1);
      let doc = workspaceManager.getDocument(uri);
      expect(doc).toBeDefined();
      expect(doc?.version).toBe(1);

      // Update with new content
      await workspaceManager.updateDocument(uri, content2, 2);
      doc = workspaceManager.getDocument(uri);
      expect(doc).toBeDefined();
      expect(doc?.version).toBe(2);
    });

    it('should handle parse errors gracefully', async () => {
      const uri = URI.file(path.join(testDir, 'Invalid.mod')).toString();
      const invalidContent = `DEFINITION MODULE Invalid
// Missing END MODULE`;

      await workspaceManager.updateDocument(uri, invalidContent, 1);
      const doc = workspaceManager.getDocument(uri);
      expect(doc).toBeDefined();
      expect(doc?.parseError).toBeDefined();
    });
  });

  describe('Module Resolution', () => {
    it('should resolve module name to URI', async () => {
      const modFile = path.join(testDir, 'TestModule.mod');
      fs.writeFileSync(
        modFile,
        `DEFINITION MODULE TestModule;
TYPE MyType = INTEGER;
END MODULE.`
      );

      await workspaceManager.initialize([testDir]);

      const uri = workspaceManager.resolveModule('TestModule');
      expect(uri).toBeDefined();
      expect(uri).toContain('TestModule.mod');
    });

    it('should return undefined for non-existent module', async () => {
      await workspaceManager.initialize([testDir]);

      const uri = workspaceManager.resolveModule('NonExistent');
      expect(uri).toBeUndefined();
    });
  });

  describe('Import Resolution', () => {
    it('should track dependencies between modules', async () => {
      const module1File = path.join(testDir, 'Module1.mod');
      const module2File = path.join(testDir, 'Module2.mod');

      fs.writeFileSync(
        module1File,
        `DEFINITION MODULE Module1;
TYPE Something = INTEGER;
END MODULE.`
      );
      fs.writeFileSync(
        module2File,
        `DEFINITION MODULE Module2;
FROM Module1 IMPORT Something;
TYPE Other = Something;
END MODULE.`
      );

      await workspaceManager.initialize([testDir]);

      const module2Uri = URI.file(module2File).toString();
      const dependencies = workspaceManager.getDependencies(module2Uri);
      expect(dependencies.length).toBeGreaterThan(0);
    });

    it('should track dependents for a module', async () => {
      const module1File = path.join(testDir, 'Module1.mod');
      const module2File = path.join(testDir, 'Module2.mod');

      fs.writeFileSync(
        module1File,
        `DEFINITION MODULE Module1;
TYPE Something = INTEGER;
END MODULE.`
      );
      fs.writeFileSync(
        module2File,
        `DEFINITION MODULE Module2;
FROM Module1 IMPORT Something;
TYPE Other = Something;
END MODULE.`
      );

      await workspaceManager.initialize([testDir]);

      const module1Uri = URI.file(module1File).toString();
      const dependents = workspaceManager.getDependents(module1Uri);
      // Module2 should depend on Module1
      expect(dependents.length).toBeGreaterThan(0);
    });
  });

  describe('Document Removal', () => {
    it('should remove document from workspace', async () => {
      const uri = URI.file(path.join(testDir, 'Module1.mod')).toString();
      const content = `DEFINITION MODULE Module1;
TYPE T = INTEGER;
END MODULE.`;

      await workspaceManager.updateDocument(uri, content, 1);
      expect(workspaceManager.getDocument(uri)).toBeDefined();

      workspaceManager.removeDocument(uri);
      expect(workspaceManager.getDocument(uri)).toBeUndefined();
    });

    it('should update dependents when removing document', async () => {
      const module1File = path.join(testDir, 'Module1.mod');
      const module2File = path.join(testDir, 'Module2.mod');

      fs.writeFileSync(
        module1File,
        `DEFINITION MODULE Module1;
TYPE Something = INTEGER;
END MODULE.`
      );
      fs.writeFileSync(
        module2File,
        `DEFINITION MODULE Module2;
FROM Module1 IMPORT Something;
TYPE Other = Something;
END MODULE.`
      );

      await workspaceManager.initialize([testDir]);

      const module1Uri = URI.file(module1File).toString();
      workspaceManager.removeDocument(module1Uri);

      // Module2 should no longer have Module1 as dependency
      const module2Uri = URI.file(module2File).toString();
      const dependencies = workspaceManager.getDependencies(module2Uri);
      expect(dependencies).not.toContain(module1Uri);
    });
  });

  describe('Symbol Lookup', () => {
    it('should lookup symbols across workspace', async () => {
      const modFile = path.join(testDir, 'Module1.mod');
      fs.writeFileSync(
        modFile,
        `DEFINITION MODULE Module1;
TYPE MyType = INTEGER;
END MODULE.`
      );

      await workspaceManager.initialize([testDir]);

      const symbol = workspaceManager.lookupSymbol('MyType');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('MyType');
    });
  });
});
