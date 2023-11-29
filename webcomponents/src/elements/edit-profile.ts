import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';
import { onSubmit, sharedStyles } from '@holochain-open-dev/elements';

import '@holochain-open-dev/elements/dist/elements/select-avatar.js';
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm";


const MIN_NICKNAME_LENGTH = 2


/**
 * @fires save-profile - Fired when the save profile button is clicked
 */
@localized()
@customElement('files-edit-profile')
export class EditProfile extends LitElement {

  /** The profile to be edited. */
  @property({ type: Object })
  profile: ProfileMat | undefined;


  /** -- Methods -- */

  /**
   * Seperate Mailgun token from other fields as we don't want it to be saved in Profiles
   */
  fireSaveProfile(formFields: Record<string, string>) {
    console.log("fireSaveProfile()", formFields);
    const nickname = formFields['nickname'];
    delete formFields['nickname'];

    const fields = {}
    fields['email'] = formFields['email'];
    fields['avatar'] = formFields['avatar']? formFields['avatar'] : "";
    fields['lang'] = formFields['option']? formFields['option'] : "";

    const profile: ProfileMat = {
      fields,
      nickname,
    };

    this.dispatchEvent(
      new CustomEvent('save-profile', {
        detail: {
          profile,
          mailgun:  formFields["mailgun"],
        },
        bubbles: true,
        composed: true,
      })
    );
  }


  /** */
  async handleLangChange(_e: any) {
    //console.log({langChangeEvent: e});
    const langRadioGroup = this.shadowRoot!.getElementById("langRadioGroup") as any;
    console.log({langRadioGroup});
    const lang = langRadioGroup.value;
    //const lang = frBtn.__checked? frBtn.value : "en";
    console.log("handleLangChange: lang =", lang);
    this.dispatchEvent(new CustomEvent('lang-selected', { detail: lang, bubbles: true, composed: true }));

  }


  /** */
  render() {
    console.log("<edit-profile>.render()", this.profile);
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
            .helpText=${msg(str`Min. ${MIN_NICKNAME_LENGTH} characters`)}
            style="margin-left: 16px;"
          ></sl-input>
        </div>
        
        <div class="row" style="justify-content: center; margin-bottom: 8px; align-self: start;" >
          <span style="font-size:18px;padding-right:10px;">${msg('Language')}:</span>
          <sl-radio-group id="langRadioGroup" @click="${this.handleLangChange}">
            <sl-radio value="en" .checked=${this.profile.fields['lang'] == 'en'}>🇬🇧</sl-radio>
            <sl-radio value="fr-fr" .checked=${this.profile.fields['lang'] == 'fr-fr'}>🇫🇷</sl-radio>
          </sl-radio-group>
        </div>
        
        <h3>Notifications</h3>
        <sl-input
                name="email"
                .label=${msg('email')}
                .helpText=${msg(str``)}
                style="margin-left: 16px;"
        ></sl-input>
        <sl-input
                name="mailgun"
                .label=${msg('mailgun token')}
                .helpText=${msg(str`Set this to become a Notifier Agent`)}
                style="margin-left: 16px;"
        ></sl-input>

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
