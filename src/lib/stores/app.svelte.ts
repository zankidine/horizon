export type Profile = 'enfant' | 'adulte'
export type Ambiance = 'jour' | 'nuit'

interface AppState {
  profile: Profile
  ambiance: Ambiance
}

function createAppStore() {
  let state = $state<AppState>({
    profile: 'enfant',
    ambiance: 'jour',
  })

  return {
    get profile() {
      return state.profile
    },
    set profile(value: Profile) {
      state.profile = value
    },
    get ambiance() {
      return state.ambiance
    },
    set ambiance(value: Ambiance) {
      state.ambiance = value
    },
  }
}

export const appStore = createAppStore()
