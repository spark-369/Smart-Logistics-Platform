import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

/**
 * Debounce-free search box with a clear affordance.
 *
 * Filtering in this app happens client-side over the current page of results, so no debouncing is
 * needed; the clear button removes the friction of manually emptying the field.
 */
const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  fullWidth = false,
  sx,
}) => (
  <TextField
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    label={label}
    aria-label={placeholder}
    sx={{ minWidth: { xs: '100%', sm: 260 }, ...sx }}
    fullWidth={fullWidth}
    slotProps={{
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="Clear search" onClick={() => onChange('')}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      },
    }}
  />
);

export default SearchInput;
