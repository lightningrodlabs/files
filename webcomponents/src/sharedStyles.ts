import { css } from 'lit';

export const sharedStyles = css`
  .missing-profiles {
    font-size: 3rem;
    --indicator-color: deeppink;
    --track-color: pink;
    --track-width: 6px;
  }

  sl-button.file::part(base) {
    border-radius: 6px;
    border-width: 2px;
    border-style: dotted;
    font-size: 0.875rem;
    font-weight: bold;
    color: #2488e0;
  }

  sl-button.file::part(prefix) {
    font-size: 1.275rem;
    margin-right: -5px;
  }

  .nickname {
    color: #2a96d5;
    font-weight: bold;
  }
`;
