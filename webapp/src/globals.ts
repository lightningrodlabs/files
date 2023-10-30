/** -- HC_APP_PORT & friends -- */

export let HC_APP_PORT: number;
export let HC_ADMIN_PORT: number;
try {
  HC_APP_PORT = Number(process.env.HC_APP_PORT);
  HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
} catch (e) {
  console.log("HC_APP_PORT not defined")
}

export let CAN_ADD_PROFILES = false;
try {
  CAN_ADD_PROFILES = Boolean(process.env.ADD_PROFILES);
} catch (e) {
  console.log("ADD_PROFILES not defined")
}
console.log("CAN_ADD_PROFILES =", CAN_ADD_PROFILES)

//console.log("HAPP_ID =", DEFAULT_FILESHARE_DEF.id)
console.log("HC_APP_PORT =", HC_APP_PORT);
console.log("HC_ADMIN_PORT =", HC_ADMIN_PORT);
