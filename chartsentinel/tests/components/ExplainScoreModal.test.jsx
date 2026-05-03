import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ExplainScoreModal from '../../src/components/dashboard/ExplainScoreModal';

// Mock the api service module — we don't want real network calls here.
// Each test stubs api.post() with the response shape it cares about.
vi.mock('../../src/services/api', () => ({
    default: {
        post: vi.fn(),
    },
}));

import api from '../../src/services/api';

const SAMPLE = {
    ticker: 'BTC-USD',
    score: 47,
    signal: 'buy',
    components: { seasonal: 30, cot: 12, pattern: 5 },
};

describe('<ExplainScoreModal>', () => {
    beforeEach(() => {
        api.post.mockReset();
    });

    it('renders nothing when data is null', () => {
        const { container } = render(<ExplainScoreModal data={null} onClose={() => {}} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders ticker + components and calls /ai/explain-score with the right payload', async () => {
        api.post.mockResolvedValueOnce({ text: 'Seasonal is the dominant driver.' });

        render(<ExplainScoreModal data={SAMPLE} onClose={() => {}} />);

        // Header shows the ticker and signed score with signal label.
        expect(screen.getByText('BTC-USD')).toBeInTheDocument();
        expect(screen.getByText(/\+47/)).toBeInTheDocument();
        expect(screen.getByText(/buy/)).toBeInTheDocument();

        // Three component tiles render the breakdown values.
        expect(screen.getByText('Seasonal')).toBeInTheDocument();
        expect(screen.getByText('COT')).toBeInTheDocument();
        expect(screen.getByText('Pattern')).toBeInTheDocument();

        // The modal mounted, fired a POST, and eventually shows the response text.
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledTimes(1);
        });

        const [path, body] = api.post.mock.calls[0];
        expect(path).toBe('/ai/explain-score');
        expect(body).toMatchObject({
            ticker: 'BTC-USD',
            score: 47,
            signal: 'buy',
            components: { seasonal: 30, cot: 12, pattern: 5 },
        });

        await waitFor(() => {
            expect(screen.getByText(/Seasonal is the dominant driver./)).toBeInTheDocument();
        });
    });

    it('shows an error message when the API call fails', async () => {
        api.post.mockRejectedValueOnce(new Error('upstream timeout'));

        render(<ExplainScoreModal data={SAMPLE} onClose={() => {}} />);

        await waitFor(() => {
            expect(screen.getByText(/Could not generate breakdown/)).toBeInTheDocument();
            expect(screen.getByText(/upstream timeout/)).toBeInTheDocument();
        });
    });
});
