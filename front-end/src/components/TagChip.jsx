import { tagColor } from '../utils/tagColor'

// A small, softly colored tag label like (school)
export default function TagChip({ name }) {
  return <span className={`tag tag-${tagColor(name)}`}>{name}</span>
}
