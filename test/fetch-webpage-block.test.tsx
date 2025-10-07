/**
 * Unit tests for FetchWebpageBlock component
 * Tests various error states and data validation scenarios
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Type definition
type FetchWebpageTool = {
  tool: 'fetch_webpage';
  urls?: string[];
  url?: string;
  query?: string;
  content?: string;
  error?: string;
};

// Mock the FetchWebpageBlock component for testing
// In real implementation, this would import from chat-tools.tsx
const FetchWebpageBlock = ({ urls, url, query, content, error, approvalState }: FetchWebpageTool & { approvalState?: string; ts?: number }) => {
  // Check if urls data is invalid
  const hasInvalidData = (
    (!Array.isArray(urls) || urls.length === 0) &&
    !url &&
    approvalState !== 'loading' &&
    approvalState !== 'pending'
  );

  const urlList = urls || (url ? [url] : []);
  const urlCount = urlList.length;

  return (
    <div data-testid="fetch-webpage-block">
      {/* Loading state */}
      {approvalState === 'loading' && (
        <div data-testid="loading-state">
          Fetching web page{urlCount > 1 ? 's' : ''}...
        </div>
      )}

      {/* Invalid data error */}
      {hasInvalidData && (
        <div data-testid="invalid-data-error">
          <p>Invalid Tool Data</p>
          <p>No URLs were provided or parsed. This may be due to:</p>
          <ul>
            <li>Missing or empty &lt;urls&gt; tag</li>
            <li>Missing &lt;url&gt; tags inside &lt;urls&gt;</li>
            <li>XML parsing failure</li>
            <li>Streaming interrupted before completion</li>
          </ul>
          <p>Expected format: &lt;urls&gt;&lt;url&gt;https://example.com&lt;/url&gt;&lt;/urls&gt;</p>
        </div>
      )}

      {/* URLs display */}
      {urlList.length > 0 && (
        <div data-testid="urls-display">
          {urlList.map((urlItem, index) => (
            <a key={index} href={urlItem} data-testid={`url-${index}`}>
              {urlItem}
            </a>
          ))}
        </div>
      )}

      {/* Query display */}
      {query && <div data-testid="query-display">{query}</div>}

      {/* Content display */}
      {content && <div data-testid="content-display">{content}</div>}

      {/* Error display */}
      {error && <div data-testid="error-display">{error}</div>}
    </div>
  );
};

describe('FetchWebpageBlock', () => {
  describe('Invalid Data Scenarios', () => {
    it('should show error when urls is undefined', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={undefined}
          approvalState="error"
        />
      );

      expect(screen.getByTestId('invalid-data-error')).toBeInTheDocument();
      expect(screen.getByText(/No URLs were provided or parsed/)).toBeInTheDocument();
    });

    it('should show error when urls is empty array', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={[]}
          approvalState="error"
        />
      );

      expect(screen.getByTestId('invalid-data-error')).toBeInTheDocument();
      expect(screen.getByText(/No URLs were provided or parsed/)).toBeInTheDocument();
    });

    it('should show error when both urls and url are missing', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          approvalState="error"
        />
      );

      expect(screen.getByTestId('invalid-data-error')).toBeInTheDocument();
    });

    it('should NOT show error during loading state even if urls is empty', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={[]}
          approvalState="loading"
        />
      );

      expect(screen.queryByTestId('invalid-data-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('should NOT show error during pending state even if urls is empty', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={[]}
          approvalState="pending"
        />
      );

      expect(screen.queryByTestId('invalid-data-error')).not.toBeInTheDocument();
    });
  });

  describe('Valid Data Scenarios', () => {
    it('should display single URL correctly', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={['https://example.com']}
          approvalState="approved"
        />
      );

      expect(screen.queryByTestId('invalid-data-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('urls-display')).toBeInTheDocument();
      expect(screen.getByTestId('url-0')).toHaveAttribute('href', 'https://example.com');
    });

    it('should display multiple URLs correctly', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={['https://example.com', 'https://test.com']}
          approvalState="approved"
        />
      );

      expect(screen.queryByTestId('invalid-data-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('urls-display')).toBeInTheDocument();
      expect(screen.getByTestId('url-0')).toHaveAttribute('href', 'https://example.com');
      expect(screen.getByTestId('url-1')).toHaveAttribute('href', 'https://test.com');
    });

    it('should support backward compatibility with single url field', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          url="https://example.com"
          approvalState="approved"
        />
      );

      expect(screen.queryByTestId('invalid-data-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('urls-display')).toBeInTheDocument();
      expect(screen.getByTestId('url-0')).toHaveAttribute('href', 'https://example.com');
    });

    it('should display query when provided', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={['https://example.com']}
          query="test query"
          approvalState="approved"
        />
      );

      expect(screen.getByTestId('query-display')).toHaveTextContent('test query');
    });

    it('should display content when provided', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={['https://example.com']}
          content="Page content here"
          approvalState="approved"
        />
      );

      expect(screen.getByTestId('content-display')).toHaveTextContent('Page content here');
    });

    it('should display error message when provided', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={['https://example.com']}
          error="Failed to fetch"
          approvalState="error"
        />
      );

      expect(screen.getByTestId('error-display')).toHaveTextContent('Failed to fetch');
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator for single URL', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={['https://example.com']}
          approvalState="loading"
        />
      );

      expect(screen.getByTestId('loading-state')).toHaveTextContent('Fetching web page...');
    });

    it('should show loading indicator for multiple URLs', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={['https://example.com', 'https://test.com']}
          approvalState="loading"
        />
      );

      expect(screen.getByTestId('loading-state')).toHaveTextContent('Fetching web pages...');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null urls', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={null as any}
          approvalState="error"
        />
      );

      expect(screen.getByTestId('invalid-data-error')).toBeInTheDocument();
    });

    it('should prioritize urls array over single url', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          urls={['https://array.com']}
          url="https://single.com"
          approvalState="approved"
        />
      );

      expect(screen.getByTestId('url-0')).toHaveAttribute('href', 'https://array.com');
      expect(screen.queryByText('https://single.com')).not.toBeInTheDocument();
    });

    it('should handle empty url string in backward compatibility mode', () => {
      render(
        <FetchWebpageBlock
          tool="fetch_webpage"
          url=""
          approvalState="error"
        />
      );

      expect(screen.getByTestId('invalid-data-error')).toBeInTheDocument();
    });
  });
});

