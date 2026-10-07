import { graphql } from 'graphql';
import { describe, expect, it } from 'vitest';
import { Project } from '../../core/project/project.js';
import { ProjectSource } from '../../core/project/source.js';
import { InMemoryAdapter } from '../../inmemory/inmemory-adapter.js';

describe('mutations for types whose plural equals the singular', () => {
    // "Sheep" is its own plural, so the bulk mutations use the createMany/updateMany/deleteMany prefixes
    const schemaSource = `
        type Sheep @rootEntity @roles(readWrite: "allusers") {
            name: String
        }
    `;

    it('supports createMany, updateMany and deleteMany', async () => {
        const project = new Project({
            sources: [new ProjectSource('schema.graphql', schemaSource)],
            getExecutionOptions: () => ({ authContext: { authRoles: ['allusers'] } }),
        });
        const db = new InMemoryAdapter();
        const schema = project.createSchema(db);
        await db.updateSchema(project.getModel());

        async function run(source: string): Promise<any> {
            const result: any = await graphql({ schema, source, rootValue: {} });
            expect(result.errors, JSON.stringify(result.errors)).to.be.undefined;
            return result.data;
        }

        const created = await run(`
            mutation {
                createManySheep(input: [{ name: "Dolly" }, { name: "Shaun" }]) {
                    id
                    name
                }
            }
        `);
        expect(created.createManySheep.map((s: any) => s.name)).to.deep.equal(['Dolly', 'Shaun']);
        const [dolly, shaun] = created.createManySheep;

        const updated = await run(`
            mutation {
                updateManySheep(input: [
                    { id: "${dolly.id}", name: "Dolly II" },
                    { id: "${shaun.id}", name: "Shaun II" }
                ]) {
                    id
                    name
                }
            }
        `);
        expect(updated.updateManySheep).to.deep.equal([
            { id: dolly.id, name: 'Dolly II' },
            { id: shaun.id, name: 'Shaun II' },
        ]);

        const deleted = await run(`
            mutation {
                deleteManySheep(ids: ["${dolly.id}", "${shaun.id}"]) {
                    id
                    name
                }
            }
        `);
        expect(deleted.deleteManySheep.map((s: any) => s.name)).to.have.members([
            'Dolly II',
            'Shaun II',
        ]);

        const remaining = await run(`query { allSheep { id } }`);
        expect(remaining.allSheep).to.deep.equal([]);
    });
});
