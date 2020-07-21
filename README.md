# veldapps-xmlgen `#todo:open`

This package mainly contains scripts and tooling for generating JavaScript code based upon/out of definitions found in the XSD documents loaded in the current  [**cavalion-code**vtools] devtools/Workspace.


The main purpose of this package is to share/abstract/generalize code concerned with **code generation out of parsed XSD documents** by devtools/Editor<xsd>.

The process 'valt uiteen in' 2 phases:

* collecting-phase
* writing-phase

For both phases code is generated. The writers can be used un changed. The collectors need to be implemented. The writers what the collectors have collected.

	{database/context} -> collectors -> writers -> {XML}

# generate-writers


# generate-collectors
