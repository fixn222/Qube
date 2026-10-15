import type { SchemaConstraint, SchemaTable } from '@qube/types';
import { buildRelationships } from './schema-introspection.service';

function makeTable(
  name: string,
  columns: string[],
  constraints: SchemaConstraint[],
  isJunctionCandidate = false,
): SchemaTable {
  return {
    schema: 'proj_test',
    name,
    columns: columns.map((column, ordinal) => ({
      name: column,
      ordinal: ordinal + 1,
      dataType: 'integer',
      nullable: false,
      defaultValue: null,
      primaryKey: constraints.some(
        (constraint) =>
          constraint.type === 'primary_key' &&
          constraint.columns.includes(column),
      ),
      unique: false,
    })),
    constraints,
    indexes: [],
    estimatedRows: null,
    sizeBytes: null,
    isJunctionCandidate,
  };
}

describe('buildRelationships', () => {
  it('preserves composite foreign key column pairs and detects one-to-one cardinality', () => {
    const tables = [
      makeTable(
        'regions',
        ['country_code', 'region_code'],
        [
          {
            name: 'regions_pkey',
            type: 'primary_key',
            columns: ['country_code', 'region_code'],
            definition: 'PRIMARY KEY (country_code, region_code)',
          },
        ],
      ),
      makeTable(
        'profiles',
        ['country_code', 'region_code', 'profile_id'],
        [
          {
            name: 'profiles_region_fk',
            type: 'foreign_key',
            columns: ['country_code', 'region_code'],
            referencedSchema: 'proj_test',
            referencedTable: 'regions',
            referencedColumns: ['country_code', 'region_code'],
            definition:
              'FOREIGN KEY (country_code, region_code) REFERENCES regions',
          },
          {
            name: 'profiles_region_unique',
            type: 'unique',
            columns: ['country_code', 'region_code'],
            definition: 'UNIQUE (country_code, region_code)',
          },
        ],
      ),
    ];

    const result = buildRelationships(tables);
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0]).toMatchObject({
      fromColumns: ['country_code', 'region_code'],
      toColumns: ['country_code', 'region_code'],
      cardinality: 'one_to_one',
      optional: false,
      source: 'constraint',
    });
  });

  it('marks non-unique foreign keys as many-to-one and generates labeled junction suggestions', () => {
    const tables = [
      makeTable('users', ['id'], []),
      makeTable('teams', ['id'], []),
      makeTable(
        'memberships',
        ['user_id', 'team_id'],
        [
          {
            name: 'memberships_user_fk',
            type: 'foreign_key',
            columns: ['user_id'],
            referencedSchema: 'proj_test',
            referencedTable: 'users',
            referencedColumns: ['id'],
            definition: 'FOREIGN KEY (user_id) REFERENCES users',
          },
          {
            name: 'memberships_team_fk',
            type: 'foreign_key',
            columns: ['team_id'],
            referencedSchema: 'proj_test',
            referencedTable: 'teams',
            referencedColumns: ['id'],
            definition: 'FOREIGN KEY (team_id) REFERENCES teams',
          },
          {
            name: 'memberships_pkey',
            type: 'primary_key',
            columns: ['user_id', 'team_id'],
            definition: 'PRIMARY KEY (user_id, team_id)',
          },
        ],
        true,
      ),
    ];

    const result = buildRelationships(tables);
    expect(result.relationships.map((item) => item.cardinality)).toEqual([
      'many_to_one',
      'many_to_one',
    ]);
    expect(result.suggestions).toEqual([
      {
        id: 'proj_test.memberships:users:teams',
        fromTable: 'users',
        toTable: 'teams',
        throughTable: 'memberships',
        source: 'inferred',
      },
    ]);
  });
});
