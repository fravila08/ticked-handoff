// PokeAPI (https://pokeapi.co): the one place the app talks to it.
// Separate from db.js, which is only for Supabase.

const POKEMON_URL = 'https://pokeapi.co/api/v2/pokemon'
const FIRST_GEN_COUNT = 151

// A random first-generation Pokémon (IDs 1-151): { name, sprite } where sprite
// is its front_default image URL. Throws if the request fails or it has no sprite.
export async function getRandomPokemon(signal) {
  const id = Math.floor(Math.random() * FIRST_GEN_COUNT) + 1
  const res = await fetch(`${POKEMON_URL}/${id}`, { signal })
  if (!res.ok) throw new Error(`PokeAPI answered ${res.status}`)
  const data = await res.json()
  const sprite = data.sprites?.front_default
  if (!sprite) throw new Error('This Pokémon has no front_default sprite')
  return { name: data.name, sprite }
}
