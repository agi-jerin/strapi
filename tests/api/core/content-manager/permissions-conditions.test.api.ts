import { prop } from 'lodash/fp';
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest, createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

interface Article {
  singularName: string;
  pluralName: string;
  displayName: string;
  attributes: {
    title: {
      type: string;
    };
    price: {
      type: string;
    };
  };
}

interface Entry {
  name: string;
  price: number;
  documentId?: string;
}

interface Role {
  id?: number;
  name: string;
  description: string;
  permissions?: Permission[];
}

interface Permission {
  action: string;
  subject: string;
  fields: null;
  conditions: string[];
}

interface User {
  id?: number;
  firstname?: string;
  lastName?: string;
  lastname?: string;
  firstName?: string;
  email: string;
  password?: string;
  roles?: number[];
}

interface TestData {
  models: {
    article: Article;
  };
  entry: Entry;
  role: Role;
  permissions: Permission[];
  userPassword: string;
  users: User[];
}

interface Requests {
  public: any;
  admin: any;
  [key: number]: any;
}

describe('Admin Permissions - Conditions', () => {
  let strapi: any;
  let utils: any;
  const builder = createTestBuilder();
  const requests: Requests = {
    public: null,
    admin: null,
  };

  const localTestData: TestData = {
    models: {
      article: {
        singularName: 'article',
        pluralName: 'articles',
        displayName: 'Article',
        attributes: {
          title: {
            type: 'string',
          },
          price: {
            type: 'integer',
          },
        },
      },
    },
    entry: {
      name: 'Test Article',
      price: 999,
    },
    role: {
      name: 'foobar',
      description: 'A dummy test role',
    },
    permissions: [
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'api::article.article',
        fields: null,
        conditions: [],
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::article.article',
        fields: null,
        conditions: ['admin::has-same-role-as-creator'],
      },
      {
        action: 'plugin::content-manager.explorer.delete',
        subject: 'api::article.article',
        fields: null,
        conditions: ['admin::is-creator'],
      },
    ],
    userPassword: 'fooBar42',
    users: [
      { firstname: 'Alice', lastname: 'Foo', email: 'alice.foo@test.com' },
      { firstname: 'Bob', lastname: 'Bar', email: 'bob.bar@test.com' },
      { firstName: 'Charlie', lastName: 'Baz', email: 'charlie.baz@test.com' },
    ],
  };

  const createFixtures = async (): Promise<void> => {
    // Login with admin and init admin tools
    requests.admin = await createAuthRequest({ strapi });
    requests.public = createRequest({ strapi });

    // Create the foobar role
    const role = await utils.createRole(localTestData.role);
    const otherRole = await utils.createRole({
      name: 'otherRole',
      description: 'Another dummy test role',
    });

    // Assign permissions to the foobar role
    const permissions = await utils.assignPermissionsToRole(role.id, localTestData.permissions);
    Object.assign(role, { permissions });

    // Create users with the new roles & create associated auth requests
    const users: User[] = [];

    for (let i = 0; i < localTestData.users.length; i += 1) {
      const userFixture = localTestData.users[i];
      const userAttributes = {
        ...userFixture,
        password: localTestData.userPassword,
        roles: [i === localTestData.users.length - 1 ? otherRole.id : role.id],
      };

      const createdUser = await utils.createUser(userAttributes);

      requests[createdUser.id] = await createAuthRequest({ strapi, userInfo: createdUser });

      users.push(createdUser);
    }

    // Update the local data store
    Object.assign(localTestData, { role, permissions, users });
  };

  const getUserRequest = (idx: number) => requests[localTestData.users[idx].id];
  const getModelName = () => localTestData.models.article.singularName;

  const deleteFixtures = async (): Promise<void> => {
    // Delete users
    const usersId = localTestData.users.map(prop('id'));
    await utils.deleteUsersById(usersId);

    // Delete the foobar role
    await utils.deleteRolesById([localTestData.role.id]);
  };

  beforeAll(async () => {
    await builder.addContentType(localTestData.models.article).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);

    await createFixtures();
  });

  afterAll(async () => {
    await deleteFixtures();

    await strapi.destroy();
    await builder.cleanup();
  });

  test('User A can create an entry', async () => {
    const rq = getUserRequest(0);
    const modelName = getModelName();
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::${modelName}.${modelName}`,
      body: localTestData.entry,
    });

    expect(res.statusCode).toBe(201);
    localTestData.entry = res.body.data;
  });

  test('User A can read its entry', async () => {
    const { documentId } = localTestData.entry;
    const modelName = getModelName();
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::${modelName}.${modelName}/${documentId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(localTestData.entry);
  });

  test('User B can read the entry created by user A', async () => {
    const { documentId } = localTestData.entry;
    const modelName = getModelName();
    const rq = getUserRequest(1);
    const editViewRes = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::${modelName}.${modelName}/${documentId}`,
    });

    expect(editViewRes.statusCode).toBe(200);
    expect(editViewRes.body.data).toMatchObject(localTestData.entry);

    // The document should also be available in the homepage content manager widgets
    const homepageRecentlyUpdatedRes = await rq({
      method: 'GET',
      url: '/content-manager/homepage/recent-documents?action=update',
    });

    expect(homepageRecentlyUpdatedRes.statusCode).toBe(200);
    expect(homepageRecentlyUpdatedRes.body.data).toHaveLength(1);
    expect(homepageRecentlyUpdatedRes.body.data[0].documentId).toBe(
      editViewRes.body.data.documentId
    );
  });

  test('User C cannot read the entry created by user A', async () => {
    const { documentId } = localTestData.entry;
    const modelName = getModelName();
    const rq = getUserRequest(2);
    const editViewRes = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::${modelName}.${modelName}/${documentId}`,
    });

    expect(editViewRes.statusCode).toBe(403);

    // The document should not be available in the homepage content manager widgets
    const homepageRecentlyUpdatedRes = await rq({
      method: 'GET',
      url: '/content-manager/homepage/recent-documents?action=update',
    });

    expect(homepageRecentlyUpdatedRes.statusCode).toBe(200);
    expect(homepageRecentlyUpdatedRes.body.data).toHaveLength(0);
  });

  test('User B cannot delete the entry created by user A', async () => {
    const { documentId } = localTestData.entry;
    const modelName = getModelName();
    const rq = getUserRequest(1);
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::${modelName}.${modelName}/${documentId}`,
    });

    expect(res.statusCode).toBe(403);
  });

  test('User A can delete its entry', async () => {
    const { documentId } = localTestData.entry;
    const modelName = getModelName();
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::${modelName}.${modelName}/${documentId}`,
    });

    expect(res.statusCode).toBe(200);
  });
});
