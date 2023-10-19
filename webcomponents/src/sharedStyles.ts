import { css } from 'lit';

export const sharedStyles = css`

  .hide {
    display: none;
  }
  
  .missing-profiles {
    font-size: 3rem;
    --indicator-color: deeppink;
    --track-color: pink;
    --track-width: 6px;
  }

  .prefixIcon {
    font-size: 1.275rem;
    margin-right: 2px;
    margin-bottom: -5px;
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

  .action-dialog {
    display: flex;
    flex-direction: column;
    color:white;
  }

  .action-dialog::part(base) {
    z-index: auto;
    background: #02070f80; /* overlay background */
  }

  .action-dialog::part(body) {
    padding-top: 0px;
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .action-dialog::part(panel) {
    background: rgba(14, 9, 36, 0.85);
    border: 2px white dashed;
    box-shadow: none;
  }
`;
