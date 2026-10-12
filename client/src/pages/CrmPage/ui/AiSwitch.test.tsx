import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { activateAiProvider, ProviderConnection } from '@/entities/crm';
import { AiSwitch } from './AiSwitch';

jest.mock('@/entities/crm', () => ({ activateAiProvider: jest.fn() }));

const connection = (overrides: Partial<ProviderConnection>): ProviderConnection => ({
    id: 'p1', name: 'Ollama (local)', type: 'AI', provider: 'OLLAMA', status: 'CONNECTED', settings: { model: 'qwen3' }, ...overrides,
});
const local = connection({});
const cloud = connection({ id: 'p2', name: 'openai', provider: 'OPENAI', settings: { model: 'gpt-5' } });
const refresh = jest.fn();
const option = (name: RegExp) => screen.getByRole('radio', { name });

beforeEach(() => {
    refresh.mockReset();
    jest.mocked(activateAiProvider).mockReset().mockResolvedValue(cloud);
    window.confirm = jest.fn(() => true);
});

test('the oldest connected provider is shown as active until another one is chosen', () => {
    render(<AiSwitch providers={[local, cloud]} refresh={refresh} />);

    expect(option(/Ollama \(local\)/)).toBeChecked();
    expect(option(/Ollama \(local\)/)).toHaveTextContent('qwen3');
    expect(option(/openai/)).not.toBeChecked();
});

test('the chosen provider is shown as active even when it is not the oldest', () => {
    render(<AiSwitch providers={[local, { ...cloud, activeForGeneration: true }]} refresh={refresh} />);

    expect(option(/openai/)).toBeChecked();
    expect(option(/Ollama \(local\)/)).not.toBeChecked();
});

test('choosing another provider asks first, switches and reads the list again', async () => {
    render(<AiSwitch providers={[local, cloud]} refresh={refresh} />);

    fireEvent.click(option(/openai/));

    await waitFor(() => expect(activateAiProvider).toHaveBeenCalledWith('p2'));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
});

test('nothing is switched when the question is declined or the active provider is clicked', () => {
    window.confirm = jest.fn(() => false);
    render(<AiSwitch providers={[local, cloud]} refresh={refresh} />);

    fireEvent.click(option(/openai/));
    fireEvent.click(option(/Ollama \(local\)/));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(activateAiProvider).not.toHaveBeenCalled();
});

test('a refused switch shows the reason', async () => {
    jest.mocked(activateAiProvider).mockRejectedValue(new Error('Enable the provider before choosing it'));
    render(<AiSwitch providers={[local, cloud]} refresh={refresh} />);

    fireEvent.click(option(/openai/));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enable the provider before choosing it');
    expect(refresh).not.toHaveBeenCalled();
});

test('a switched-off provider is not offered and the switch hides when none can answer', () => {
    const { rerender } = render(<AiSwitch providers={[local, { ...cloud, status: 'DISABLED' }]} refresh={refresh} />);
    expect(screen.getAllByRole('radio')).toHaveLength(1);

    rerender(<AiSwitch providers={[{ ...local, status: 'DISABLED' }]} refresh={refresh} />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
});
