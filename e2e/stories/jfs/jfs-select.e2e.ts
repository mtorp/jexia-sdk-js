import { lastValueFrom } from 'rxjs';
import * as faker from "faker";
import * as Joi from "joi";
import { field } from "../../../src";
import { IFilteringCriterion, IFilteringCriterionCallback } from "../../../src/api/core/filteringApi";
import { Fileset } from "../../../src/api/fileops/fileset";
import { BackendErrorSchema } from "../../lib/common";
import { FilesetRecordSchema } from "../../lib/fileset";
import { cleaning, DEFAULT_FILESET, initWithJFS, jfs } from "../../teardowns";

// tslint:disable-next-line:no-var-requires
const joiAssert = require("joi-assert");

jest.setTimeout(15000); // for unstable internet connection

describe("filter records REST API", () => {
  let fileset: Fileset<any, any, any, any>;

  const FIELD = {
    BOOLEAN: "boolean_field",
    INTEGER: "integer_field",
    FLOAT: "float_field",
    STRING: "string_field",
  };
  type Condition = IFilteringCriterion<any> | IFilteringCriterionCallback<any>;

  function testLength(title: string, condition: Condition, expectedLength: number) {
    it(`should select records by "${title}"`, async () => {
      const selectResult = await lastValueFrom(fileset
        .select()
        .where(condition));

      expect(selectResult.length).toEqual(expectedLength);
    });
  }

  function testError(title: string, condition: Condition) {
    it(`should throw error when selecting records by "${title}"`, async () => {
      try {
        await lastValueFrom(fileset
          .select()
          .where(condition));
      } catch (e) {
        joiAssert(e, BackendErrorSchema);
      }
    });
  }

  function setupData(testData: Array<{ data: any }>) {
    return lastValueFrom(fileset
      .upload(testData));
  }

  function clearData() {
    return lastValueFrom(fileset
      .delete()
      .where(field("id").isNotNull()));
  }

  function test(
    successTests: Array<{title: string; condition: Condition, expectedLength: number}>,
    failTests: Array<{title: string; condition: Condition}>) {

    successTests.forEach(({ title, condition, expectedLength }) => {
      testLength(title, condition, expectedLength);
    });

    failTests.forEach(({ title, condition }) => {
      testError(title, condition);
    });
  }

  beforeAll(async () => {
    await initWithJFS(
      DEFAULT_FILESET.NAME,
      [
        { name: FIELD.BOOLEAN, type: "boolean" },
        { name: FIELD.INTEGER, type: "integer" },
        { name: FIELD.FLOAT, type: "float" },
        { name: FIELD.STRING, type: "string" },
      ],
    );
    fileset = jfs.fileset(DEFAULT_FILESET.NAME);
  });

  afterAll(async () => cleaning());

  describe("when filtering boolean types", () => {
    const fieldName = FIELD.BOOLEAN;

    const successTests = [
      {
        title: "isEqualTo",
        condition: field(fieldName).isEqualTo(true),
        expectedLength: 2,
      },
      {
        title: "isDifferentFrom",
        condition: field(fieldName).isDifferentFrom(true),
        expectedLength: 2,
      },
      {
        title: "isInArray",
        condition: field(fieldName).isInArray([false]),
        expectedLength: 1,
      },
      {
        title: "isNotInArray",
        condition: field(fieldName).isNotInArray([false]),
        expectedLength: 2, // doesn't include null values
      },
      {
        title: "isNull",
        condition: field(fieldName).isNull(),
        expectedLength: 1,
      },
      {
        title: "isNotNull",
        condition: field(fieldName).isNotNull(),
        expectedLength: 3,
      },
    ];

    const failTests = [
      {
        title: "isGreaterThan",
        condition: field(fieldName).isGreaterThan(true),
      },
      {
        title: "isLessThan",
        condition: field(fieldName).isLessThan(true),
      },
      {
        title: "isEqualOrGreaterThan",
        condition: field(fieldName).isEqualOrGreaterThan(false),
      },
      {
        title: "isEqualOrLessThan",
        condition: field(fieldName).isEqualOrLessThan(true),
      },
      {
        title: "isLike",
        condition: field(fieldName).isLike("true"),
      },
      {
        title: "isBetween",
        condition: field(fieldName).isBetween(true, false),
      },
    ];

    const testData = [
      { [fieldName]: null },
      { [fieldName]: true },
      { [fieldName]: true },
      { [fieldName]: false },
    ].map((data) => ({ data }));

    beforeAll(async () => await setupData(testData));

    afterAll(async () => await clearData());

    test(successTests, failTests);
  });

  describe("when filtering integer types", () => {
    const fieldName = FIELD.INTEGER;

    const successTests = [
      {
        title: "isEqualTo",
        condition: field(fieldName).isEqualTo(1),
        expectedLength: 1,
      },
      {
        title: "isDifferentFrom",
        condition: field(fieldName).isDifferentFrom(2),
        expectedLength: 4,
      },
      {
        title: "isGreaterThan",
        condition: field(fieldName).isGreaterThan(1),
        expectedLength: 3,
      },
      {
        title: "isLessThan",
        condition: field(fieldName).isLessThan(2),
        expectedLength: 1,
      },
      {
        title: "isEqualOrGreaterThan",
        condition: field(fieldName).isEqualOrGreaterThan(1),
        expectedLength: 4,
      },
      {
        title: "isEqualOrLessThan",
        condition: field(fieldName).isEqualOrLessThan(3),
        expectedLength: 3,
      },
      {
        title: "isBetween",
        condition: field(fieldName).isBetween(2, 4),
        expectedLength: 3,
      },
      {
        title: "isInArray",
        condition: field(fieldName).isInArray([2, 4]),
        expectedLength: 2,
      },
      {
        title: "isNotInArray",
        condition: field(fieldName).isNotInArray([2, 4]),
        expectedLength: 2, // doesn't include null values
      },
      {
        title: "isNull",
        condition: field(fieldName).isNull(),
        expectedLength: 1,
      },
      {
        title: "isNotNull",
        condition: field(fieldName).isNotNull(),
        expectedLength: 4,
      },
    ];

    const failTests = [
      {
        title: "isLike",
        condition: field(fieldName).isLike("1"),
      },
    ];

    const testData = [
      { [fieldName]: null },
      { [fieldName]: 1 },
      { [fieldName]: 2 },
      { [fieldName]: 3 },
      { [fieldName]: 4 },
    ].map((data) => ({ data }));

    beforeAll(async () => await setupData(testData));

    afterAll(async () => await clearData());

    test(successTests, failTests);
  });

  describe("when filtering float types", () => {
    const fieldName = FIELD.FLOAT;

    const successTests = [
      {
        title: "isEqualTo",
        condition: field(fieldName).isEqualTo(6.7),
        expectedLength: 1,
      },
      {
        title: "isDifferentFrom",
        condition: field(fieldName).isDifferentFrom(6.7),
        expectedLength: 4,
      },
      {
        title: "isGreaterThan",
        condition: field(fieldName).isGreaterThan(2.0),
        expectedLength: 3,
      },
      {
        title: "isLessThan",
        condition: field(fieldName).isLessThan(6),
        expectedLength: 3,
      },
      {
        title: "isEqualOrGreaterThan",
        condition: field(fieldName).isEqualOrGreaterThan(4.6),
        expectedLength: 2,
      },
      {
        title: "isEqualOrLessThan",
        condition: field(fieldName).isEqualOrLessThan(2.4),
        expectedLength: 2,
      },
      {
        title: "isBetween",
        condition: field(fieldName).isBetween(1, 3),
        expectedLength: 2,
      },
      {
        title: "isNull",
        condition: field(fieldName).isNull(),
        expectedLength: 1,
      },
      {
        title: "isNotNull",
        condition: field(fieldName).isNotNull(),
        expectedLength: 4,
      },
    ];

    const failTests = [
      {
        title: "isLike",
        condition: field(fieldName).isLike("1"),
      },
    ];

    const testData = [
      { [fieldName]: null },
      { [fieldName]: 1.5 },
      { [fieldName]: 2.4 },
      { [fieldName]: 4.6 },
      { [fieldName]: 6.7 },
    ].map((data) => ({ data }));

    beforeAll(async () => await setupData(testData));

    afterAll(async () => await clearData());

    test(successTests, failTests);
  });

  describe("when filtering string types", () => {
    const fieldName = FIELD.STRING;

    const successTests = [
      {
        title: "isEqualTo",
        condition: field(fieldName).isEqualTo("1st"),
        expectedLength: 1,
      },
      {
        title: "isDifferentFrom",
        condition: field(fieldName).isDifferentFrom("1st"),
        expectedLength: 4,
      },
      {
        title: "isLike",
        condition: field(fieldName).isLike("%th"),
        expectedLength: 1,
      },
      {
        title: "isInArray",
        condition: field(fieldName).isInArray(["3rd", "4th"]),
        expectedLength: 2,
      },
      {
        title: "isNotInArray",
        condition: field(fieldName).isNotInArray(["3rd", "4th"]),
        expectedLength: 2, // doesn't include null values
      },
      {
        title: "isNull",
        condition: field(fieldName).isNull(),
        expectedLength: 1,
      },
      {
        title: "isNotNull",
        condition: field(fieldName).isNotNull(),
        expectedLength: 4,
      },
    ];

    const failTests = [
      {
        title: "isGreaterThan",
        condition: field(fieldName).isGreaterThan("1"),
      },
      {
        title: "isEqualOrGreaterThan",
        condition: field(fieldName).isEqualOrGreaterThan("1"),
      },
      {
        title: "isLessThan",
        condition: field(fieldName).isLessThan("4"),
      },
      {
        title: "isEqualOrLessThan",
        condition: field(fieldName).isEqualOrLessThan("4"),
      },
      {
        title: "isBetween",
        condition: field(fieldName).isBetween("1", "4"),
      },
    ];

    const testData = [
      { [fieldName]: null },
      { [fieldName]: "1st" },
      { [fieldName]: "2nd" },
      { [fieldName]: "3rd" },
      { [fieldName]: "4th" },
    ].map((data) => ({ data }));

    beforeAll(async () => await setupData(testData));

    afterAll(async () => await clearData());

    test(successTests, failTests);
  });

  describe("when setting range", () => {
    const testData = [
      { [FIELD.STRING]: "1st" },
      { [FIELD.STRING]: "2nd" },
      { [FIELD.STRING]: "3rd" },
      { [FIELD.STRING]: "4th" },
      { [FIELD.STRING]: "5th" },
      { [FIELD.STRING]: "6th" },
    ].map((data) => ({ data }));

    beforeAll(async () => await setupData(testData));

    afterAll(async () => await clearData());

    it("should return less items when limit is lower than total of results", async () => {
      const result = await lastValueFrom(fileset
        .select()
        .limit(2));

      expect(result.length).toEqual(2);
    });

    it("should return all items when limit is higher than total of results", async () => {
      const result = await lastValueFrom(fileset
        .select()
        .limit(10));

      expect(result.length).toEqual(testData.length);
    });

    it(`should split results when setting limit/offset`, async () => {
      const limit = 2;
      const result = await lastValueFrom(fileset
        .select()
        .limit(limit)
        .offset(1));

      const expectedSchema = Joi
        .array()
        .items(FilesetRecordSchema.append({
          [FIELD.STRING]: Joi.string().valid("2nd", "3rd"),
          [FIELD.BOOLEAN]: Joi.empty(),
          [FIELD.INTEGER]: Joi.empty(),
          [FIELD.FLOAT]: Joi.empty(),
          [FIELD.STRING]: Joi.empty(),
        }))
        .length(limit);

      joiAssert(result, expectedSchema);
    });
  });

  describe("when sorting", () => {
    const testData = Array.from(
      { length: 5 },
      (v, index) => ({
        [FIELD.STRING]: faker.name.findName(),
        [FIELD.INTEGER]: faker.random.number({ min: index }),
      }),
    );
    let sortField: string;

    beforeAll(async () => await setupData(testData.map((data) => ({ data }))));

    afterAll(async () => await clearData());

    function byFieldAsc(a: any, b: any) {
      if (a[sortField] > b[sortField]) { return 1; }
      if (a[sortField] < b[sortField]) { return -1; }
      return 0;
    }

    function byFieldDesc(a: any, b: any) {
      if (a[sortField] < b[sortField]) { return 1; }
      if (a[sortField] > b[sortField]) { return -1; }
      return 0;
    }

    async function testSorting(fn: "sortAsc" | "sortDesc", sortFn: (a: any, b: any) => number) {
      sortField = faker.random.arrayElement([FIELD.STRING, FIELD.INTEGER]);

      const result = await lastValueFrom(fileset
        .select()
        [fn](sortField));

      const orderedSchemas = testData
        .slice(0) // copy array
        .sort(sortFn)
        .map((record: { [field: string]: any }) => ({
          [FIELD.STRING]: Joi.string().equal(record[FIELD.STRING]),
          [FIELD.BOOLEAN]: Joi.empty(),
          [FIELD.INTEGER]: Joi.number().integer().equal(record[FIELD.INTEGER]),
          [FIELD.FLOAT]: Joi.empty(),
          [FIELD.STRING]: Joi.empty(),
        }))
        .map((schema) => FilesetRecordSchema.append(schema));

      const expectedSchema = Joi
        .array()
        .ordered(...orderedSchemas);

      joiAssert(result, expectedSchema);
    }

    it("should return ascending sorted results", async () => {
      await testSorting("sortAsc", byFieldAsc);
    });

    it("should return descending sorted results", async () => {
      await testSorting("sortDesc", byFieldDesc);
    });

  });

});
