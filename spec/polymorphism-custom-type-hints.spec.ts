﻿import { jsonObject, jsonMember, jsonArrayMember, TypedJSON } from "../src/typedjson";
import { IndexedObject } from '../src/typedjson/types';

describe('polymorphism custom type hints', function () {

    describe('should work for a base class', function () {
        let TYPE_MAP: IndexedObject;

        @jsonObject({
            typeHintEmitter: (targetObject, sourceObject) => targetObject.personType = sourceObject.constructor.name + 'Type',
            typeResolver: sourceObject => TYPE_MAP[sourceObject.personType],
        })
        abstract class Person
        {
            @jsonMember
            public firstName: string;

            @jsonMember
            public lastName: string;

            constructor();
            constructor(firstName?: string, lastName?: string);
            constructor(firstName: string, lastName: string);
            constructor(firstName?: string, lastName?: string) {
                if (firstName && lastName)
                {
                    this.firstName = firstName;
                    this.lastName = lastName;
                }
            }
        }

        @jsonObject
        class Employee extends Person
        {
            @jsonMember
            public salary: number;

            constructor();
            constructor(firstName: string, lastName: string);
            constructor(firstName: string, lastName: string, salary: number);
            constructor(firstName?: string, lastName?: string, salary?: number) {
                super(firstName, lastName);

                if (salary)
                {
                    this.salary = salary;
                }
            }
        }

        @jsonObject
        class PartTimeEmployee extends Employee
        {
            @jsonMember
            public workHours: number;
        }

        @jsonObject
        class Investor extends Person
        {
            @jsonMember
            public investAmount: number;

            constructor();
            constructor(firstName: string, lastName: string);
            constructor(firstName: string, lastName: string, investAmount: number);
            constructor(firstName?: string, lastName?: string, investAmount?: number) {
                super(firstName, lastName);

                this.investAmount = investAmount || 0;
            }
        }

        TYPE_MAP = {
            'EmployeeType': Employee,
            'PartTimeEmployeeType': PartTimeEmployee,
            'InvestorType': Investor,
        }

        @jsonObject
        class Company
        {
            @jsonMember
            public name: string;

            @jsonArrayMember(Employee)
            public employees: Array<Employee> = [];

            @jsonMember
            public owner: Person;
        }

        it('should emit custom hint', function () {
            const company = new Company();
            company.name = "Json Types";
            company.owner = new Investor("John", "White", 1700000);

            const partTime = new PartTimeEmployee("Abe", "White", 160000);
            partTime.workHours = 20;
            company.employees = [
                new Employee("Donn", "Worker", 240000),
                partTime,
                new Employee("Smith", "Elly", 35500),
            ];

            const json = TypedJSON.toPlainJson(company, Company);
            expect(json).toEqual({
                name: 'Json Types',
                owner: {personType: 'InvestorType', firstName: 'John', lastName: 'White', investAmount: 1700000},
                employees: [
                    {personType: 'EmployeeType', firstName: 'Donn', lastName: 'Worker', salary: 240000},
                    {
                        personType: 'PartTimeEmployeeType',
                        firstName: 'Abe',
                        lastName: 'White',
                        salary: 160000,
                        workHours: 20,
                    },
                    {personType: 'EmployeeType', firstName: 'Smith', lastName: 'Elly', salary: 35500},
                ],
            });
        });

        it('should resolve custom hints', function () {
            const json = {
                name: 'Json Types',
                owner: {personType: 'InvestorType', firstName: 'John', lastName: 'White', investAmount: 1700000},
                employees: [
                    {personType: 'EmployeeType', firstName: 'Donn', lastName: 'Worker', salary: 240000},
                    {
                        personType: 'PartTimeEmployeeType',
                        firstName: 'Abe',
                        lastName: 'White',
                        salary: 160000,
                        workHours: 20,
                    },
                    {personType: 'EmployeeType', firstName: 'Smith', lastName: 'Elly', salary: 35500},
                ],
            };

            const deserialized = TypedJSON.parse(JSON.stringify(json), Company);

            const company = new Company();
            company.name = "Json Types";
            company.owner = new Investor("John", "White", 1700000);

            const partTime = new PartTimeEmployee("Abe", "White", 160000);
            partTime.workHours = 20;
            company.employees = [
                new Employee("Donn", "Worker", 240000),
                partTime,
                new Employee("Smith", "Elly", 35500),
            ];
            expect(deserialized).toEqual(company);
        });
    });

    describe('should override parents', function () {
        abstract class StructuralBase
        {
            @jsonMember
            value: string;
        }

        @jsonObject({
            typeHintEmitter: (targetObject, sourceObject) => targetObject.type = (sourceObject.constructor as any).type,
            typeResolver: (sourceObject => sourceObject.type === 'sub-one' ? ConcreteOne : AnotherConcreteOne),
        })
        abstract class SemanticBaseOne extends StructuralBase
        {
            @jsonMember
            prop1: number;
        }

        @jsonObject
        class ConcreteOne extends SemanticBaseOne
        {
            static type = 'sub-one';
            @jsonMember
            propSub: string;
        }

        @jsonObject
        class AnotherConcreteOne extends SemanticBaseOne
        {
            static type = 'sub-two';
            @jsonMember
            propSub: number;
        }

        @jsonObject({
            typeHintEmitter: (targetObject, sourceObject) => targetObject.hint = sourceObject instanceof ConcreteTwo ? 'first' : 'another',
            typeResolver: (sourceObject => sourceObject.hint === 'first' ? ConcreteTwo : AnotherConcreteTwo),
        })
        abstract class SemanticBaseTwo extends StructuralBase
        {
            @jsonMember
            prop2: number;
        }

        @jsonObject
        class ConcreteTwo extends SemanticBaseTwo
        {
            @jsonMember
            propSub: string;
        }

        @jsonObject
        class AnotherConcreteTwo extends SemanticBaseTwo
        {
            @jsonMember
            propSub: number;
        }

        it('should work for SemanticBaseOne', function () {
            const inputAndResult: [() => SemanticBaseOne, () => IndexedObject][] = [
                [
                    () => {
                        const expected = new ConcreteOne();
                        expected.value = 'base';
                        expected.prop1 = 10;
                        expected.propSub = 'something';
                        return expected;
                    },
                    () => ({
                        type: 'sub-one',
                        value: 'base',
                        prop1: 10,
                        propSub: 'something',
                    }),
                ],
                [
                    () => {
                        const expected = new AnotherConcreteOne();
                        expected.value = 'base value';
                        expected.prop1 = 245;
                        expected.propSub = 234;
                        return expected;
                    },
                    () => ({
                        type: 'sub-two',
                        value: 'base value',
                        prop1: 245,
                        propSub: 234,
                    }),
                ],
            ];

            inputAndResult.forEach(([inputFn, serializedFn]) => {
                expect(TypedJSON.toPlainJson(inputFn(), SemanticBaseOne)).toEqual(serializedFn());
                expect(TypedJSON.parse(serializedFn(), SemanticBaseOne)).toEqual(inputFn());
            })
        });

        it('should work for SemanticBaseTwo', function () {
            const inputAndResult: [() => SemanticBaseTwo, () => IndexedObject][] = [
                [
                    () => {
                        const expected = new ConcreteTwo();
                        expected.value = 'base';
                        expected.prop2 = 546;
                        expected.propSub = 'something';
                        return expected;
                    },
                    () => ({
                        hint: 'first',
                        value: 'base',
                        prop2: 546,
                        propSub: 'something',
                    }),
                ],
                [
                    () => {
                        const expected = new AnotherConcreteTwo();
                        expected.value = 'base value';
                        expected.prop2 = 74;
                        expected.propSub = 234;
                        return expected;
                    },
                    () => ({
                        hint: 'another',
                        value: 'base value',
                        prop2: 74,
                        propSub: 234,
                    }),
                ],
            ];

            inputAndResult.forEach(([inputFn, serializedFn]) => {
                expect(TypedJSON.toPlainJson(inputFn(), SemanticBaseTwo)).toEqual(serializedFn());
                expect(TypedJSON.parse(serializedFn(), SemanticBaseTwo)).toEqual(inputFn());
            })
        });
    })
});
