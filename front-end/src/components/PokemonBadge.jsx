import { useEffect, useState } from 'react'
import { getRandomPokemon } from '../data/pokeapi'

// A circle with a random Pokémon sprite, picked each time it mounts.
// Purely decorative: while loading or if PokeAPI fails it stays an empty circle.
export default function PokemonBadge() {
  const [sprite, setSprite] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getRandomPokemon(controller.signal)
      .then((pokemon) => setSprite(pokemon.sprite))
      .catch(() => {}) // aborted or failed: keep the empty circle
    return () => controller.abort()
  }, [])

  return (
    <span className="pokemon-badge" aria-hidden="true">
      {sprite && <img src={sprite} alt="" />}
    </span>
  )
}
