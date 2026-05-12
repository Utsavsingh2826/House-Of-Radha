import { fireEvent } from '@testing-library/react';

// Reliable text-input helper for the React 19 + userEvent v14 combo on jsdom,
// where `await user.type(...)` intermittently drops characters. fireEvent.change
// dispatches a single synthetic change event with the full final value, which
// is exactly what controlled inputs expect.
export function fillInput(input, value) {
  fireEvent.change(input, { target: { value } });
}
