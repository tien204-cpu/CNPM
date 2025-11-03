import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'
export { default } from './App2'
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>Subtotal: ${subtotal.toFixed(2)}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => go('/cart')} disabled={cart.length === 0}>Open cart</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
              </div>
            </div>
          </div>
        )
      }
