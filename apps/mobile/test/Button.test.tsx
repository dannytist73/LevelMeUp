import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Button } from '../src/ui/Button.tsx';

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

describe('Button label', () => {
  it.each(['primary', 'commitment', 'secondary'] as const)('%s: fills the button and wraps, never cuts', async (variant) => {
    // A label box only as wide as its words lost its last word on Android ("Add a set" showed "Add a").
    await render(<Button label="Add a set" variant={variant} onPress={jest.fn()} />);
    expect(styleOf('Add a set')).toMatchObject({ alignSelf: 'stretch', textAlign: 'center' });
    expect(screen.getByText('Add a set').props.numberOfLines).toBeUndefined();
  });
});
