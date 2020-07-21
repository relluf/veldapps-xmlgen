# veldapps-xmlgen `#todo:open`

The initial purpose of this package is to share/abstract/generalize code concerned with **code generation out of parsed XSD documents** between different project. Currently two (sub-)projects use it:

* veldapps-xmlgen-broservices (link)
* veldapps-xmlgen-imsikb0101 (link)

This package mainly contains scripts and tooling for generating JavaScript code based upon definitions found in the XSD documents loaded in the current **cavalion:devtools/Workspace<>**.


* scaffold


This XML-generation process defines 2 phases:

* collecting-phase
* writing-phase

For both phases scaffold-code is generated:

* Writers
* Collectors

The code for the writers typically doesn't need any adjustments, it can be used as is. The code for the collecting phase needs to be implemented. The writers what the collectors have collected.

	{database/context} -> collectors -> writers -> {XML}

# generate-writers


# generate-collectors
