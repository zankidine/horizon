<script lang="ts">
  import { T } from '@threlte/core'
  import {
    creerSceneHublot,
    CAMERA,
    ECHELLE_HALO,
    ECHELLE_LISERE,
    INCLINAISON_TERRE,
    INTENSITE_AMBIANTE,
    INTENSITE_SOLEIL,
    POSITION_LUNE,
    POSITION_SOLEIL,
    POSITION_TERRE,
    RAYON_LUNE,
    RAYON_TERRE,
    type EtatHublot,
  } from './hublot.svelte'

  let { etat }: { etat: EtatHublot } = $props()

  // svelte-ignore state_referenced_locally
  const scene = creerSceneHublot(etat)
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

<T.Group position={POSITION_TERRE} rotation.z={INCLINAISON_TERRE}>
  <T.Mesh
    geometry={scene.geometrieSphere}
    material={scene.materiauTerre}
    scale={RAYON_TERRE}
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
  position={POSITION_LUNE}
  geometry={scene.geometrieSphere}
  material={scene.materiauLune}
  scale={RAYON_LUNE}
  bind:ref={scene.refs.lune}
/>
