<script lang="ts">
  import { T } from '@threlte/core'
  import {
    creerSceneHublot,
    etatHublotParDefaut,
    CAMERA,
    ECHELLE_HALO,
    ECHELLE_LISERE,
    INCLINAISON_TERRE,
    INTENSITE_AMBIANTE,
    INTENSITE_SOLEIL,
    POSITION_SOLEIL,
    type EtatHublot,
  } from './hublot.svelte'
  import { vaisseau as vaisseauParDefaut, type SimulationVaisseau } from './vaisseau.svelte'

  // Les deux props sont facultatives : sans elles, la scène utilise l'état du
  // hublot et le vaisseau partagés (singletons). Une scène montée par
  // VueExterieure, qui ne passe que `etat`, reflète donc le vaisseau du jeu.
  let {
    etat = etatHublotParDefaut(),
    vaisseau = vaisseauParDefaut,
  }: { etat?: EtatHublot; vaisseau?: SimulationVaisseau } = $props()

  // svelte-ignore state_referenced_locally
  const scene = creerSceneHublot(etat, vaisseau)
</script>

<T.PerspectiveCamera
  makeDefault
  fov={CAMERA.fov}
  near={CAMERA.near}
  far={CAMERA.far}
  bind:ref={scene.refs.camera}
/>

<T.DirectionalLight position={POSITION_SOLEIL} intensity={INTENSITE_SOLEIL} />
<T.AmbientLight intensity={INTENSITE_AMBIANTE} />

<T.Points
  geometry={scene.geometrieEtoiles}
  material={scene.materiauEtoiles}
  frustumCulled={false}
/>

<T.Points
  geometry={scene.geometriePoussiere}
  material={scene.materiauPoussiere}
  frustumCulled={false}
/>

<T.Mesh
  geometry={scene.geometrieSoleil}
  material={scene.materiauSoleil}
  frustumCulled={false}
  bind:ref={scene.refs.soleil}
/>

<!-- Position et taille de la Terre et de la Lune : placées à chaque image par la scène. -->
<T.Group rotation.z={INCLINAISON_TERRE} bind:ref={scene.refs.groupeTerre}>
  <T.Mesh
    geometry={scene.geometrieSphere}
    material={scene.materiauTerre}
    bind:ref={scene.refs.terre}
  />
  <T.Mesh
    geometry={scene.geometrieSphere}
    material={scene.materiauLisere}
    scale={ECHELLE_LISERE}
  />
  <T.Mesh
    geometry={scene.geometrieSphere}
    material={scene.materiauHalo}
    scale={ECHELLE_HALO}
  />
</T.Group>

<T.Mesh
  geometry={scene.geometrieSphere}
  material={scene.materiauLune}
  bind:ref={scene.refs.lune}
/>
