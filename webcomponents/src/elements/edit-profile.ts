import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';
import { onSubmit, sharedStyles } from '@holochain-open-dev/elements';

import {FileShareProfile} from "../viewModels/profiles.proxy";


import '@holochain-open-dev/elements/dist/elements/select-avatar.js';


const MIN_NICKNAME_LENGTH = 2


/**
 * @element edit-profile
 * @fires save-profile - Fired when the save profile button is clicked
 */
@localized()
@customElement('edit-profile')
export class EditProfile extends LitElement {
  /**
   * The profile to be edited.
   */
  @property({ type: Object })
  profile: FileShareProfile | undefined;



  /** -- Methods -- */

  /** */
  fireSaveProfile(fields: Record<string, string>) {
    const nickname = fields['nickname'];
    delete fields['nickname'];

    const profile: FileShareProfile = {
      fields,
      nickname,
    };

    this.dispatchEvent(
      new CustomEvent('save-profile', {
        detail: {
          profile,
        },
        bubbles: true,
        composed: true,
      })
    );
  }


  /** */
  render() {
    return html`
      <form id="profile-form" class="column"
        ${onSubmit(fields => this.fireSaveProfile(fields))}>
        
        <div class="row"
          style="justify-content: center; align-self: start; margin-bottom: 16px">
          <select-avatar
                  style="cursor:pointer"
                  name="avatar"
                .value=${this.profile?.fields['avatar'] || undefined}
              ></select-avatar>

          <sl-input
            name="nickname"
            .label=${msg('Nickname')}
            required
            minLength="${MIN_NICKNAME_LENGTH}"
            .value=${this.profile?.nickname || ''}
            .helpText=${msg(
              str`Min. ${MIN_NICKNAME_LENGTH} characters`
            )}
            style="margin-left: 16px;"
          ></sl-input>
        </div>

        <div class="row" style="margin-top: 8px;">
          <sl-button style="flex: 1;" variant="primary" type="submit"
            >${msg('Save Profile')}
          </sl-button>
        </div>
      </form>
    `;
  }


  static styles = [sharedStyles, css`

    sl-radio {
      font-size: larger;
    }

    .row {
      display: flex;
      flex-direction: row;
    }
    .column {
      display: flex;
      flex-direction: column;
    }
    .small-margin {
      margin-top: 6px;
    }
    .big-margin {
      margin-top: 23px;
    }

    .fill {
      flex: 1;
      height: 100%;
    }

    .title {
      font-size: 20px;
    }

    .center-content {
      align-items: center;
      justify-content: center;
    }

    .placeholder {
      color: rgba(0, 0, 0, 0.7);
    }

    .label {
      color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6));
      font-family: var(
              --mdc-typography-caption-font-family,
              var(--mdc-typography-font-family, Roboto, sans-serif)
      );
      font-size: var(--mdc-typography-caption-font-size, 0.79rem);
      font-weight: var(--mdc-typography-caption-font-weight, 400);
    }

    .flex-scrollable-parent {
      position: relative;
      display: flex;
      flex: 1;
    }

    .flex-scrollable-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    .flex-scrollable-x {
      max-width: 100%;
      overflow-x: auto;
    }
    .flex-scrollable-y {
      max-height: 100%;
      overflow-y: auto;
    }`];
}