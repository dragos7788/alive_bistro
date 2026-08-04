import { ForkKnife, Cookie, Coffee, Egg, Wine, TeaBag, Drop, Carrot } from "@phosphor-icons/react"
import { Coffee as LucideCoffee, Leaf } from "lucide-react"

const registry: Record<string, (size: number) => React.ReactNode> = {
  "fork-knife": (s) => <ForkKnife size={s} />,
  "cookie":     (s) => <Cookie size={s} />,
  "coffee":     (s) => <Coffee size={s} />,
  "egg":        (s) => <Egg size={s} />,
  "wine":       (s) => <Wine size={s} />,
  "tea-bag":    (s) => <TeaBag size={s} />,
  "drop":       (s) => <Drop size={s} />,
  "carrot":     (s) => <Carrot size={s} />,
  "lucide-coffee": (s) => <LucideCoffee size={s} />,
  "leaf":       (s) => <Leaf size={s} />,
}

export function resolveIcon(key: string, size = 20): React.ReactNode {
  return registry[key]?.(size) ?? null
}
