import type { InteractionMethodName, LocatorAttemptRecord } from './types';

export class AgenticFlowBuilderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class MapValidationError extends AgenticFlowBuilderError {}
export class TargetContractError extends AgenticFlowBuilderError {}
export class DataResolutionError extends AgenticFlowBuilderError {}
export class AuthError extends AgenticFlowBuilderError {}
export class FlowLockError extends AgenticFlowBuilderError {}
export class RunSessionError extends AgenticFlowBuilderError {}

export class LocatorResolutionError extends AgenticFlowBuilderError {
  readonly elementId: string;
  readonly attempts: LocatorAttemptRecord[];

  constructor(input: { elementId: string; message: string; attempts: LocatorAttemptRecord[]; cause?: unknown }) {
    super(input.message, { cause: input.cause });
    this.elementId = input.elementId;
    this.attempts = input.attempts;
  }
}

export class InteractionExecutionError extends AgenticFlowBuilderError {
  readonly elementId: string;
  readonly method: InteractionMethodName;

  constructor(input: { elementId: string; method: InteractionMethodName; message: string; cause?: unknown }) {
    super(input.message, { cause: input.cause });
    this.elementId = input.elementId;
    this.method = input.method;
  }
}

export class AssertionExecutionError extends AgenticFlowBuilderError {
  readonly assertionId: string;
  readonly expected?: unknown;
  readonly actual?: unknown;

  constructor(input: { assertionId: string; message: string; expected?: unknown; actual?: unknown; cause?: unknown }) {
    super(input.message, { cause: input.cause });
    this.assertionId = input.assertionId;
    this.expected = input.expected;
    this.actual = input.actual;
  }
}
