import 'server-only'
import { randomInt } from 'node:crypto'

// Sem caracteres ambíguos (0/O, 1/l/I) para facilitar a digitação na pista.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

/** Senha aleatória forte no formato xxxx-xxxx-xxxx (~70 bits de entropia). */
export function gerarSenha() {
  const bloco = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
  return `${bloco()}-${bloco()}-${bloco()}`
}
